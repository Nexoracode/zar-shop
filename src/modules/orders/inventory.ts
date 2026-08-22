import type { Prisma } from "@generated/prisma/client";
import { decrementOptionValueStock, incrementOptionValueStock, isOptionSnapshotValid, selectedOptionRows } from "@/modules/products/options";

export type InventoryTransaction = Pick<Prisma.TransactionClient, "product" | "productOption">;
export type InventoryOrderItem = {
  productId: string | null;
  quantity: number;
  selectedOptions: Prisma.JsonValue | null;
};

export class InventoryUnavailableError extends Error {
  constructor() {
    super("موجودی یک یا چند قلم سفارش کافی نیست.");
    this.name = "InventoryUnavailableError";
  }
}

// A concurrent order touching the same option value (e.g. the last unit of one size) can
// invalidate our read between fetching the row and writing it back. `stockVersion` gives
// us a compare-and-swap: on a lost race we re-read the fresh row and try again, instead of
// blindly overwriting whatever the other transaction just committed.
const MAX_OPTION_STOCK_ATTEMPTS = 5;

async function adjustOptionRowStock(
  transaction: InventoryTransaction,
  optionId: string,
  targetValue: string,
  quantity: number,
  fallbackStock: number,
  mode: "decrement" | "increment",
) {
  for (let attempt = 0; attempt < MAX_OPTION_STOCK_ATTEMPTS; attempt += 1) {
    const row = await transaction.productOption.findUnique({
      where: { id: optionId },
      select: { id: true, name: true, values: true, stockVersion: true },
    });
    if (!row) return;

    let nextValues;
    try {
      nextValues = mode === "decrement"
        ? decrementOptionValueStock(row, targetValue, quantity, fallbackStock)
        : incrementOptionValueStock(row, targetValue, quantity);
    } catch {
      throw new InventoryUnavailableError();
    }

    const written = await transaction.productOption.updateMany({
      where: { id: optionId, stockVersion: row.stockVersion },
      data: { values: nextValues, stockVersion: { increment: 1 } },
    });
    if (written.count === 1) return;
  }
  throw new InventoryUnavailableError();
}

export async function reserveInventory(transaction: InventoryTransaction, items: InventoryOrderItem[]) {
  for (const item of items) {
    if (!item.productId) continue;
    const reserved = await transaction.product.updateMany({
      where: { id: item.productId, status: "ACTIVE", stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (reserved.count !== 1) throw new InventoryUnavailableError();

    const product = await transaction.product.findUnique({
      where: { id: item.productId },
      select: { stock: true, options: { select: { id: true, name: true, values: true } } },
    });
    if (!product) throw new InventoryUnavailableError();
    const stockBeforeReservation = product.stock + item.quantity;
    if (!isOptionSnapshotValid(product.options, item.selectedOptions, item.quantity, stockBeforeReservation)) {
      throw new InventoryUnavailableError();
    }

    for (const row of selectedOptionRows(product.options, item.selectedOptions)) {
      await adjustOptionRowStock(transaction, row.id, row.targetValue, item.quantity, stockBeforeReservation, "decrement");
    }
  }
}

export async function releaseInventory(transaction: InventoryTransaction, items: InventoryOrderItem[]) {
  for (const item of items) {
    if (!item.productId) continue;
    const product = await transaction.product.findUnique({
      where: { id: item.productId },
      select: { options: { select: { id: true, name: true, values: true } } },
    });
    if (product) {
      for (const row of selectedOptionRows(product.options, item.selectedOptions)) {
        await adjustOptionRowStock(transaction, row.id, row.targetValue, item.quantity, 0, "increment");
      }
    }
    await transaction.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
  }
}
