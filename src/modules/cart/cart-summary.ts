import { db } from "@/lib/db";
import { isCartLineUnavailable } from "@/modules/cart/line-availability";
import { lineUnitPrice } from "@/modules/products/line-pricing";
import { findVariant, variantMaxQuantity } from "@/modules/products/variants";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getOrderSettings } from "@/modules/settings/order-settings";
import type { StoreIndustry } from "@generated/prisma/enums";

export function countDistinctCartProducts(items: ReadonlyArray<{ productId: string }>) {
  return new Set(items.map((item) => item.productId)).size;
}

export async function getCartProductCount(userId: string, storeIndustry: StoreIndustry) {
  // The header badge counts what can be bought, so it agrees with the totals — a line whose combination is gone is not counted.
  const items = await db.cartItem.findMany({
    where: { cart: { userId }, product: { storeIndustry } },
    select: { productId: true, selectionKey: true, product: { select: { status: true, variants: true } } },
  });
  return countDistinctCartProducts(items.filter((item) => !isCartLineUnavailable(item.product, item.selectionKey)));
}

export async function getCartSummary(userId: string) {
  const [settings, orderSettings, cart] = await Promise.all([
    getGeneralStoreSettings(),
    getOrderSettings(),
    db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          orderBy: { id: "asc" },
          include: { product: { include: { variants: true, media: { where: { isCover: true }, include: { media: true }, take: 1 } } } },
        },
      },
    }),
  ]);
  // Lines that can no longer be bought are not part of what the customer would pay for.
  const cartItems = (cart?.items ?? []).filter((item) => item.product.storeIndustry === settings.industry && !isCartLineUnavailable(item.product, item.selectionKey));
  const needsGoldRate = cartItems.some((item) => item.product.storeIndustry === "GOLD" && item.product.fixedPrice === null);
  const gold = needsGoldRate ? await getGoldPriceForDisplay() : null;
  const rate = gold?.pricePerGram18 ?? null;
  let priceUnavailable = false;

  const items = cartItems.map((item) => {
    const product = item.product;
    const pricing = lineUnitPrice(product, item.selectionKey, rate);
    if (!pricing) priceUnavailable = true;
    const cover = product.media[0]?.media;
    return {
      id: item.id,
      name: product.name,
      slug: product.slug,
      imageUrl: cover?.type === "IMAGE" ? cover.url : null,
      imageAlt: cover?.alt ?? product.name,
      quantity: item.quantity,
      maxQuantity: variantMaxQuantity(findVariant(product.variants, item.selectionKey), orderSettings.maxOrderItemQuantity),
      unitPrice: pricing?.finalPrice ?? 0,
      originalUnitPrice: pricing?.isActive ? pricing.originalPrice : null,
      discountPercent: pricing?.isActive && pricing.originalPrice > 0 ? Math.round(((pricing.originalPrice - pricing.finalPrice) / pricing.originalPrice) * 100) : null,
    };
  });
  const itemCount = countDistinctCartProducts(cartItems);
  const subtotal = priceUnavailable ? null : items.reduce((sum, item) => sum + (item.originalUnitPrice ?? item.unitPrice) * item.quantity, 0);
  const total = priceUnavailable ? null : items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return {
    itemCount,
    items,
    subtotal,
    total,
    discount: subtotal === null || total === null ? null : subtotal - total,
    currency: settings.currency,
  };
}
