import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { getSelectedOptionPrice, getSelectedOptionWeight } from "@/modules/products/options";
import { baseShippingFee, getCommerceSettings } from "@/modules/settings/commerce-settings";
import { getGeneralStoreSettings, isStorefrontAvailable } from "@/modules/settings/general-settings";
import { PromotionValidationError, resolveCheckoutPromotions } from "@/modules/promotions/service";

const schema = z.object({
  couponCode: z.string().trim().max(64).default(""),
  addressId: z.string().cuid(),
  deliveryMethod: z.enum(["INSURED_SHIPPING", "STORE_PICKUP"]),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "برای بررسی سفارش ابتدا وارد حساب شوید." }, { status: 401 });
    const input = schema.parse(await request.json());
    const [cart, gold, commerceSettings, generalSettings, address] = await Promise.all([
      db.cart.findUnique({ where: { userId: user.id }, include: { items: { include: { product: { include: { options: true } } } } } }),
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
      const selectedWeight = getSelectedOptionWeight(product.options, item.selectedOptions, product.weightGrams);
      const original = product.storeIndustry === "GENERAL"
        ? getSelectedOptionPrice(product.options, item.selectedOptions, Number(product.fixedPrice ?? 0))
        : product.fixedPrice ? Number(product.fixedPrice) : calculateProductPrice({ goldPricePerGram18: rate!, weightGrams: selectedWeight, purity: product.purity, makingFeeType: product.makingFeeType, makingFeeValue: product.makingFeeValue, profitPercent: product.profitPercent, taxPercent: product.taxPercent }).total;
      const pricing = calculateDiscountedPrice(original, product);
      return { quantity: item.quantity, original: pricing.originalPrice, final: pricing.finalPrice };
    });
    const subtotal = prices.reduce((sum, item) => sum + item.original * item.quantity, 0);
    const merchandiseAmount = prices.reduce((sum, item) => sum + item.final * item.quantity, 0);
    const productDiscount = subtotal - merchandiseAmount;
    const shippingFee = baseShippingFee(commerceSettings, merchandiseAmount, input.deliveryMethod);
    const promotions = await resolveCheckoutPromotions(db, { userId: user.id, couponCode: input.couponCode, merchandiseAmount, shippingFee, city: address.cityRef?.name ?? address.city });
    const shipping = Math.max(0, shippingFee - promotions.shippingDiscount);
    return NextResponse.json({
      subtotal,
      productDiscount,
      merchandiseAmount,
      promotionDiscount: promotions.promotionDiscount,
      shipping,
      shippingDiscount: promotions.shippingDiscount,
      total: merchandiseAmount - promotions.promotionDiscount + shipping,
      applications: promotions.applications.map((item) => ({ title: item.title, code: item.code, discountAmount: item.discountAmount, shippingDiscount: item.shippingDiscount })),
    });
  } catch (error) {
    if (error instanceof PromotionValidationError) return NextResponse.json({ message: error.message }, { status: 422 });
    return apiError(error);
  }
}
