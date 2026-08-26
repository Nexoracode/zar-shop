import type { Prisma } from "@generated/prisma/client";

export type InventoryTransaction = Pick<Prisma.TransactionClient, "product" | "productVariant">;
export type InventoryOrderItem = {
  productId: string | null;
  quantity: number;
  /** Empty for a product sold without variants. */
  selectionKey: string;
};

export class InventoryUnavailableError extends Error {
  constructor() {
    super("موجودی یک یا چند قلم سفارش کافی نیست.");
    this.name = "InventoryUnavailableError";
  }
}

/*
 * A concurrent order buying the same combination — the last black XL — can invalidate our read
 * between fetching the row and writing it back. `stockVersion` gives a compare-and-swap: on a
 * lost race we re-read the fresh row and try again, rather than overwriting whatever the other
 * transaction just committed.
 *
 * One row per line now, where the per-value model had to touch one row per option. Selling a
 * black XL used to decrement "مشکی" and "XL" separately, which could not express that the pair
 * itself had run out.
 */
const MAX_VARIANT_STOCK_ATTEMPTS = 5;

async function adjustVariantStock(
  transaction: InventoryTransaction,
  productId: string,
  selectionKey: string,
  quantity: number,
  mode: "decrement" | "increment",
) {
  for (let attempt = 0; attempt < MAX_VARIANT_STOCK_ATTEMPTS; attempt += 1) {
    const variant = await transaction.productVariant.findUnique({
      where: { productId_selectionKey: { productId, selectionKey } },
      select: { id: true, stock: true, isActive: true, stockVersion: true },
    });
    // Releasing stock for a combination that has since been deleted is a no-op, not a failure:
    // the order keeps its own snapshot and nothing is owed back to a row that is gone.
    if (!variant) {
      if (mode === "increment") return;
      throw new InventoryUnavailableError();
    }

    if (mode === "decrement" && (!variant.isActive || variant.stock < quantity)) {
      throw new InventoryUnavailableError();
    }

    const written = await transaction.productVariant.updateMany({
      where: { id: variant.id, stockVersion: variant.stockVersion },
      data: {
        stock: mode === "decrement" ? { decrement: quantity } : { increment: quantity },
        stockVersion: { increment: 1 },
      },
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

    if (item.selectionKey) {
      await adjustVariantStock(transaction, item.productId, item.selectionKey, item.quantity, "decrement");
    }
  }
}

export async function releaseInventory(transaction: InventoryTransaction, items: InventoryOrderItem[]) {
  for (const item of items) {
    if (!item.productId) continue;
    if (item.selectionKey) {
      await adjustVariantStock(transaction, item.productId, item.selectionKey, item.quantity, "increment");
    }
    await transaction.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
  }
}
