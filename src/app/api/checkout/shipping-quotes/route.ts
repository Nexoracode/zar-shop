import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { getSelectedOptionPrice, getSelectedOptionWeight } from "@/modules/products/options";
import { calculateProductPrice } from "@/modules/products/pricing";
import { getCommerceSettings, qualifiesForFreeShipping } from "@/modules/settings/commerce-settings";
import { getGeneralStoreSettings, isStorefrontAvailable } from "@/modules/settings/general-settings";
import { chargeableCartWeight, getShippingQuotes } from "@/modules/shipping/quote";

const schema = z.object({ addressId: z.string().cuid() });

/**
 * The delivery options for this cart and address, priced.
 *
 * Prices are worked out here rather than in the browser so the customer never sees a figure the
 * server would not stand behind, and so the carrier call keeps its key and its timeout on the
 * server side.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "برای مشاهده روش‌های ارسال ابتدا وارد حساب شوید." }, { status: 401 });
    const input = schema.parse(await request.json());

    const [cart, gold, commerceSettings, generalSettings, address] = await Promise.all([
      db.cart.findUnique({ where: { userId: user.id }, include: { items: { include: { product: { include: { options: true } } } } } }),
      getGoldPriceForDisplay(),
      getCommerceSettings(),
      getGeneralStoreSettings(),
      db.address.findFirst({ where: { id: input.addressId, userId: user.id, type: "SHIPPING" }, select: { provinceId: true, cityId: true } }),
    ]);
    if (!isStorefrontAvailable(generalSettings, user.role)) return NextResponse.json({ message: "فروشگاه در حال حاضر امکان ثبت سفارش را ندارد." }, { status: 503 });
    if (!address?.provinceId) return NextResponse.json({ message: "نشانی انتخاب‌شده معتبر نیست." }, { status: 422 });
    if (!cart?.items.length) return NextResponse.json({ message: "سبد خرید خالی است." }, { status: 409 });

    const rate = gold?.pricePerGram18 ?? null;
    const merchandiseAmount = cart.items.reduce((sum, item) => {
      const product = item.product;
      const selectedWeight = getSelectedOptionWeight(product.options, item.selectedOptions, product.weightGrams);
      const original = product.storeIndustry === "GENERAL"
        ? getSelectedOptionPrice(product.options, item.selectedOptions, Number(product.fixedPrice ?? 0))
        : product.fixedPrice
          ? Number(product.fixedPrice)
          : rate === null ? 0 : calculateProductPrice({ goldPricePerGram18: rate, weightGrams: selectedWeight, purity: product.purity, makingFeeType: product.makingFeeType, makingFeeValue: product.makingFeeValue, profitPercent: product.profitPercent, taxPercent: product.taxPercent }).total;
      return sum + calculateDiscountedPrice(original, product).finalPrice * item.quantity;
    }, 0);

    const products = cart.items.map((item) => ({
      shippingWeightGrams: item.product.shippingWeightGrams,
      packageLengthCm: item.product.packageLengthCm === null ? null : Number(item.product.packageLengthCm),
      packageWidthCm: item.product.packageWidthCm === null ? null : Number(item.product.packageWidthCm),
      packageHeightCm: item.product.packageHeightCm === null ? null : Number(item.product.packageHeightCm),
      quantity: item.quantity,
    }));
    const weightGrams = chargeableCartWeight(products, commerceSettings.defaultParcelWeightGrams);

    const quotes = await getShippingQuotes({
      lines: products,
      weightGrams,
      declaredValue: merchandiseAmount,
      destination: { provinceId: address.provinceId, cityId: address.cityId },
    });

    // A cart over the threshold ships free whichever carrier the customer prefers, so the choice
    // stays on the page and only the numbers go to zero.
    const free = qualifiesForFreeShipping(commerceSettings, merchandiseAmount);
    return NextResponse.json({
      weightGrams,
      freeShipping: free,
      pickupAvailable: commerceSettings.inStorePickupEnabled,
      methods: quotes.map((quote) => ({ ...quote, price: free ? 0 : quote.price })),
    });
  } catch (error) {
    return apiError(error);
  }
}
