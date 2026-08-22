import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@generated/prisma/client";
import { InventoryUnavailableError, releaseInventory, reserveInventory } from "./inventory";

function inventoryDb() {
  const state = {
    stock: 3,
    options: [{ id: "size", name: "سایز", values: [{ value: "1", isActive: true, stock: 2 }], stockVersion: 0 }],
  };
  const transaction = {
    product: {
      updateMany: async ({ where, data }: { where: { stock: { gte: number } }; data: { stock: { decrement: number } } }) => {
        if (state.stock < where.stock.gte) return { count: 0 };
        state.stock -= data.stock.decrement;
        return { count: 1 };
      },
      findUnique: async () => ({ stock: state.stock, options: state.options }),
      update: async ({ data }: { data: { stock: { increment: number } } }) => { state.stock += data.stock.increment; },
    },
    productOption: {
      findUnique: async () => ({ ...state.options[0] }),
      updateMany: async ({ where, data }: {
        where: { id: string; stockVersion: number };
        data: { values: typeof state.options[number]["values"]; stockVersion: { increment: number } };
      }) => {
        if (state.options[0].stockVersion !== where.stockVersion) return { count: 0 };
        state.options[0].values = data.values;
        state.options[0].stockVersion += data.stockVersion.increment;
        return { count: 1 };
      },
    },
  } as unknown as Pick<Prisma.TransactionClient, "product" | "productOption">;
  return { state, transaction };
}

const item = { productId: "product-1", quantity: 2, selectedOptions: { سایز: "1" } } as const;

test("inventory reservation atomically decrements product and selected option stock", async () => {
  const { state, transaction } = inventoryDb();
  await reserveInventory(transaction, [item]);
  assert.equal(state.stock, 1);
  assert.equal(state.options[0].values[0].stock, 0);
  await assert.rejects(() => reserveInventory(transaction, [item]), InventoryUnavailableError);
  assert.equal(state.stock, 1);
});

test("inventory release restores a previously reserved order", async () => {
  const { state, transaction } = inventoryDb();
  await reserveInventory(transaction, [item]);
  await releaseInventory(transaction, [item]);
  assert.equal(state.stock, 3);
  assert.equal(state.options[0].values[0].stock, 2);
});

test("inventory reservation retries past a concurrent option-stock write instead of clobbering it", async () => {
  const { state, transaction } = inventoryDb();
  const singleUnitItem = { ...item, quantity: 1 };
  let attempts = 0;
  const originalUpdateMany = transaction.productOption.updateMany;
  transaction.productOption.updateMany = ((args: unknown) => {
    attempts += 1;
    if (attempts === 1) {
      // Simulate a concurrent order committing its own reservation of the same option
      // value right between our read and our write.
      state.options[0].values[0].stock -= 1;
      state.options[0].stockVersion += 1;
      return Promise.resolve({ count: 0 });
    }
    return originalUpdateMany(args as Parameters<typeof originalUpdateMany>[0]);
  }) as unknown as typeof originalUpdateMany;

  await reserveInventory(transaction, [singleUnitItem]);

  assert.equal(attempts, 2);
  // Both the simulated concurrent writer's decrement and ours were applied — neither was lost.
  assert.equal(state.options[0].values[0].stock, 0);
  assert.equal(state.options[0].stockVersion, 2);
});
