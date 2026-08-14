import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@generated/prisma/client";
import { InventoryUnavailableError, releaseInventory, reserveInventory } from "./inventory";

function inventoryDb() {
  const state = {
    stock: 3,
    options: [{ id: "size", name: "سایز", values: [{ value: "1", isActive: true, stock: 2 }] }],
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
      update: async ({ data }: { data: { values: typeof state.options[number]["values"] } }) => { state.options[0].values = data.values; },
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
