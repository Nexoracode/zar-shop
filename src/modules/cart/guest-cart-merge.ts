import type { Prisma } from "@generated/prisma/client";

export type CartMergeTransaction = Pick<Prisma.TransactionClient, "cart" | "cartItem" | "product">;

/**
 * Folds a guest user's cart into the account they just logged into or registered.
 * Quantities are summed on conflicting product/option combinations and clamped to
 * current stock; anything that no longer fits (out of stock) is dropped rather than
 * left behind, since the guest cart and its row are removed once this returns.
 */
export async function mergeGuestCartIntoUser(
  transaction: CartMergeTransaction,
  guestUserId: string,
  targetUserId: string,
  maxOrderItemQuantity: number,
) {
  const guestCart = await transaction.cart.findUnique({ where: { userId: guestUserId }, include: { items: true } });
  if (!guestCart) return;
  if (!guestCart.items.length) {
    await transaction.cart.delete({ where: { id: guestCart.id } });
    return;
  }

  // Only create a cart for the target user once we know there is something to put in it —
  // an all-out-of-stock guest cart should not leave behind an empty cart row.
  let targetCart: { id: string } | null = null;

  for (const item of guestCart.items) {
    const product = await transaction.product.findUnique({ where: { id: item.productId }, select: { stock: true } });
    if (!product || product.stock < 1) continue;
    targetCart ??= await transaction.cart.upsert({ where: { userId: targetUserId }, update: {}, create: { userId: targetUserId } });
    const existing = await transaction.cartItem.findUnique({
      where: { cartId_productId_selectionKey: { cartId: targetCart.id, productId: item.productId, selectionKey: item.selectionKey } },
    });
    const quantity = Math.min(maxOrderItemQuantity, product.stock, (existing?.quantity ?? 0) + item.quantity);
    await transaction.cartItem.upsert({
      where: { cartId_productId_selectionKey: { cartId: targetCart.id, productId: item.productId, selectionKey: item.selectionKey } },
      create: { cartId: targetCart.id, productId: item.productId, selectionKey: item.selectionKey, selectedOptions: item.selectedOptions ?? undefined, quantity },
      update: { quantity },
    });
  }

  await transaction.cart.delete({ where: { id: guestCart.id } });
}
