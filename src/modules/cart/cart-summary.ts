import { db } from "@/lib/db";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { getSelectedOptionPrice, getSelectedOptionWeight } from "@/modules/products/options";
import { calculateProductPrice } from "@/modules/products/pricing";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getOrderSettings } from "@/modules/settings/order-settings";

export async function getCartSummary(userId: string) {
  const [settings, orderSettings, cart] = await Promise.all([
    getGeneralStoreSettings(),
    getOrderSettings(),
    db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          orderBy: { id: "asc" },
          include: { product: { include: { options: true, media: { where: { isCover: true }, include: { media: true }, take: 1 } } } },
        },
      },
    }),
  ]);
  const cartItems = (cart?.items ?? []).filter((item) => item.product.storeIndustry === settings.industry);
  const needsGoldRate = cartItems.some((item) => item.product.storeIndustry === "GOLD" && item.product.fixedPrice === null);
  const gold = needsGoldRate ? await getGoldPriceForDisplay() : null;
  const rate = gold?.pricePerGram18 ?? null;
  let priceUnavailable = false;

  const items = cartItems.map((item) => {
    const product = item.product;
    const selectedWeight = getSelectedOptionWeight(product.options, item.selectedOptions, product.weightGrams);
    const baseAmount = product.storeIndustry === "GENERAL"
      ? getSelectedOptionPrice(product.options, item.selectedOptions, Number(product.fixedPrice ?? 0))
      : product.fixedPrice ? Number(product.fixedPrice) : rate === null ? null : calculateProductPrice({ goldPricePerGram18: rate, weightGrams: selectedWeight, purity: product.purity, makingFeeType: product.makingFeeType, makingFeeValue: product.makingFeeValue, profitPercent: product.profitPercent, taxPercent: product.taxPercent }).total;
    const pricing = baseAmount === null ? null : calculateDiscountedPrice(baseAmount, product);
    if (!pricing) priceUnavailable = true;
    const cover = product.media[0]?.media;
    return {
      id: item.id,
      name: product.name,
      slug: product.slug,
      imageUrl: cover?.type === "IMAGE" ? cover.url : null,
      imageAlt: cover?.alt ?? product.name,
      quantity: item.quantity,
      maxQuantity: Math.min(orderSettings.maxOrderItemQuantity, product.stock),
      unitPrice: pricing?.finalPrice ?? 0,
      originalUnitPrice: pricing?.isActive ? pricing.originalPrice : null,
      discountPercent: pricing?.isActive && pricing.originalPrice > 0 ? Math.round(((pricing.originalPrice - pricing.finalPrice) / pricing.originalPrice) * 100) : null,
    };
  });
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
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
