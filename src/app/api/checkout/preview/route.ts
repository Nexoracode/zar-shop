import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { lineUnitPrice } from "@/modules/products/line-pricing";
import { baseShippingFee, defaultDeliveryMethod, getCommerceSettings, qualifiesForFreeShipping } from "@/modules/settings/commerce-settings";
import { chargeableCartWeight, quoteForMethod } from "@/modules/shipping/quote";
import { getGeneralStoreSettings, isStorefrontAvailable } from "@/modules/settings/general-settings";
import { PromotionValidationError, resolveCheckoutPromotions } from "@/modules/promotions/service";

const schema = z.object({
  couponCode: z.string().trim().max(64).default(""),
  addressId: z.string().cuid(),
  /** Absent until the customer has picked one; the flat fee stands in until then. */
  shippingMethodId: z.union([z.null(), z.string().cuid()]).default(null),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "برای بررسی سفارش ابتدا وارد حساب شوید." }, { status: 401 });
    const input = schema.parse(await request.json());
    const [cart, gold, commerceSettings, generalSettings, address] = await Promise.all([
      db.cart.findUnique({ where: { userId: user.id }, include: { items: { include: { product: { include: { variants: true } } } } } }),
      getGoldPriceForDisplay(),
      getCommerceSettings(),
      getGeneralStoreSettings(),
      db.address.findFirst({ where: { id: input.addressId, userId: user.id, type: "SHIPPING" }, include: { cityRef: true } }),
    ]);
    if (!address) return NextResponse.json({ message: "نشانی انتخاب‌شده معتبر نیست." }, { status: 422 });
    if (!isStorefrontAvailable(generalSettings, user.role)) return NextResponse.json({ message: "فروشگاه در حال حاضر امکان بررسی سفارش را ندارد." }, { status: 503 });
    if (!cart?.items.length) return NextResponse.json({ message: "سبد خرید خالی است." }, { status: 409 });
    if (cart.items.some((item) => item.product.storeIndustry !== generalSettings.industry)) return NextResponse.json({ message: "بعضی کالاهای سبد با قالب فعلی فروشگاه سازگار نیستند." }, { status: 409 });
    const needsGoldRate = cart.items.some((item) => item.product.storeIndustry === "GOLD" && item.product.fixedPrice === null);
    const rate = gold?.pricePerGram18 ?? null;
    if (needsGoldRate && rate === null) return NextResponse.json({ message: "نرخ لحظه‌ای طلا موقتاً در دسترس نیست." }, { status: 503 });
    const prices = cart.items.map((item) => {
      const product = item.product;
      const pricing = lineUnitPrice(product, item.selectionKey, rate);
      return { quantity: item.quantity, original: pricing?.originalPrice ?? 0, final: pricing?.finalPrice ?? 0 };
    });
    const subtotal = prices.reduce((sum, item) => sum + item.original * item.quantity, 0);
    const merchandiseAmount = prices.reduce((sum, item) => sum + item.final * item.quantity, 0);
    const productDiscount = subtotal - merchandiseAmount;
    // The picked method decides the fee; the flat rate stands in before a choice is made, and a
    // cart over the free-shipping threshold pays nothing either way.
    const chosen = input.shippingMethodId && address.provinceId && !qualifiesForFreeShipping(commerceSettings, merchandiseAmount)
      ? await quoteForMethod(input.shippingMethodId, {
        lines: [],
        weightGrams: chargeableCartWeight(cart.items.map((item) => ({
          shippingWeightGrams: item.product.shippingWeightGrams,
          packageLengthCm: item.product.packageLengthCm === null ? null : Number(item.product.packageLengthCm),
          packageWidthCm: item.product.packageWidthCm === null ? null : Number(item.product.packageWidthCm),
          packageHeightCm: item.product.packageHeightCm === null ? null : Number(item.product.packageHeightCm),
          quantity: item.quantity,
        })), commerceSettings.defaultParcelWeightGrams),
        declaredValue: merchandiseAmount,
        destination: { provinceId: address.provinceId, cityId: address.cityId },
      })
      : null;
    const shippingFee = chosen ? chosen.price : baseShippingFee(commerceSettings, merchandiseAmount, defaultDeliveryMethod(commerceSettings));
    const promotions = await resolveCheckoutPromotions(db, { userId: user.id, couponCode: input.couponCode, merchandiseAmount, shippingFee, city: address.cityRef?.name ?? address.city });
    const shipping = Math.max(0, shippingFee - promotions.shippingDiscount);
    return NextResponse.json({
      subtotal,
      productDiscount,
      merchandiseAmount,
      promotionDiscount: promotions.promotionDiscount,
      shipping,
      shippingDiscount: promotions.shippingDiscount,
      shippingMethodTitle: chosen?.title ?? null,
      total: merchandiseAmount - promotions.promotionDiscount + shipping,
      applications: promotions.applications.map((item) => ({ title: item.title, code: item.code, discountAmount: item.discountAmount, shippingDiscount: item.shippingDiscount })),
    });
  } catch (error) {
    if (error instanceof PromotionValidationError) return NextResponse.json({ message: error.message }, { status: 422 });
    return apiError(error);
  }
}
