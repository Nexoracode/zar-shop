import type { Prisma } from "@generated/prisma/client";
import { decrementSelectedOptionStocksStrict, incrementSelectedOptionStocks } from "@/modules/products/options";

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
    let options;
    try {
      options = decrementSelectedOptionStocksStrict(product.options, item.selectedOptions, item.quantity, stockBeforeReservation);
    } catch {
      throw new InventoryUnavailableError();
    }
    for (const option of options) {
      await transaction.productOption.update({ where: { id: option.id }, data: { values: option.values } });
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
    if (!product) continue;
    for (const option of incrementSelectedOptionStocks(product.options, item.selectedOptions, item.quantity)) {
      await transaction.productOption.update({ where: { id: option.id }, data: { values: option.values } });
    }
    await transaction.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
  }
}
