import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@generated/prisma/client";
import { InventoryUnavailableError, releaseInventory, reserveInventory } from "./inventory";

function inventoryDb() {
  const state = {
    stock: 3,
    variant: { id: "variant-1", stock: 2, isActive: true, stockVersion: 0 },
  };
  const transaction = {
    product: {
      updateMany: async ({ where, data }: { where: { stock: { gte: number } }; data: { stock: { decrement: number } } }) => {
        if (state.stock < where.stock.gte) return { count: 0 };
        state.stock -= data.stock.decrement;
        return { count: 1 };
      },
      findUnique: async () => ({ stock: state.stock }),
      update: async ({ data }: { data: { stock: { increment: number } } }) => { state.stock += data.stock.increment; },
    },
    productVariant: {
      findUnique: async () => ({ ...state.variant }),
      updateMany: async ({ where, data }: {
        where: { id: string; stockVersion: number };
        data: { stock: { decrement?: number; increment?: number }; stockVersion: { increment: number } };
      }) => {
        if (state.variant.stockVersion !== where.stockVersion) return { count: 0 };
        state.variant.stock -= data.stock.decrement ?? 0;
        state.variant.stock += data.stock.increment ?? 0;
        state.variant.stockVersion += data.stockVersion.increment;
        return { count: 1 };
      },
    },
  } as unknown as Pick<Prisma.TransactionClient, "product" | "productVariant">;
  return { state, transaction };
}

const item = { productId: "product-1", quantity: 2, selectionKey: "black-xl" } as const;

test("inventory reservation atomically decrements product and combination stock", async () => {
  const { state, transaction } = inventoryDb();
  await reserveInventory(transaction, [item]);
  assert.equal(state.stock, 1);
  assert.equal(state.variant.stock, 0);
  await assert.rejects(() => reserveInventory(transaction, [item]), InventoryUnavailableError);
  assert.equal(state.stock, 1);
});

test("inventory release restores a previously reserved order", async () => {
  const { state, transaction } = inventoryDb();
  await reserveInventory(transaction, [item]);
  await releaseInventory(transaction, [item]);
  assert.equal(state.stock, 3);
  assert.equal(state.variant.stock, 2);
});

test("a product sold without variants only moves its own stock", async () => {
  const { state, transaction } = inventoryDb();
  await reserveInventory(transaction, [{ productId: "product-1", quantity: 1, selectionKey: "" }]);
  assert.equal(state.stock, 2);
  assert.equal(state.variant.stock, 2);
});

test("an inactive combination cannot be reserved", async () => {
  const { state, transaction } = inventoryDb();
  state.variant.isActive = false;
  await assert.rejects(() => reserveInventory(transaction, [{ ...item, quantity: 1 }]), InventoryUnavailableError);
});

test("inventory reservation retries past a concurrent write instead of clobbering it", async () => {
  const { state, transaction } = inventoryDb();
  let attempts = 0;
  const originalUpdateMany = transaction.productVariant.updateMany;
  transaction.productVariant.updateMany = ((args: unknown) => {
    attempts += 1;
    if (attempts === 1) {
      // Simulate a concurrent order committing its own reservation of the same combination
      // right between our read and our write.
      state.variant.stock -= 1;
      state.variant.stockVersion += 1;
      return Promise.resolve({ count: 0 });
    }
    return originalUpdateMany(args as Parameters<typeof originalUpdateMany>[0]);
  }) as unknown as typeof originalUpdateMany;

  await reserveInventory(transaction, [{ ...item, quantity: 1 }]);

  assert.equal(attempts, 2);
  // Both the simulated concurrent writer's decrement and ours were applied — neither was lost.
  assert.equal(state.variant.stock, 0);
  assert.equal(state.variant.stockVersion, 2);
});
