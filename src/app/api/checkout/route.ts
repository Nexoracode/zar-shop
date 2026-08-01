import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { getGoldPrice } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";
import { getSelectedOptionPrice, getSelectedOptionWeight, isOptionSnapshotValid, optionEntries } from "@/modules/products/options";
import { getPaymentProvider } from "@/modules/payments/payment-provider";
import type { Prisma } from "@generated/prisma/client";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { PromotionValidationError, resolveCheckoutPromotions } from "@/modules/promotions/service";
import { getGeneralStoreSettings, isStorefrontAvailable } from "@/modules/settings/general-settings";
import { getOrderSettings, orderExpiresAt } from "@/modules/settings/order-settings";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { baseShippingFee, estimatedReadyAt, getCommerceSettings } from "@/modules/settings/commerce-settings";
import { sendAutomatedSms } from "@/modules/communications/sms-service";

type ItemWithProduct = Prisma.CartItemGetPayload<{ include: { product: { include: { options: true } } } }>;
type PriceParts = ReturnType<typeof calculateProductPrice>;
type CheckoutLine = { item: ItemWithProduct; p: ItemWithProduct["product"]; parts: PriceParts; originalUnitPrice: number; discountAmount: number; unitPrice: number; total: number };

const addressSchema = z.object({
  recipient: z.string().min(3).max(150),
  phone: z.string().regex(/^09\d{9}$/),
  province: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  postalCode: z.string().min(5).max(20),
  addressLine: z.string().min(10).max(1000),
  couponCode: z.string().trim().max(64).optional().default(""),
  deliveryMethod: z.enum(["INSURED_SHIPPING", "STORE_PICKUP"]),
});

export async function POST(request: Request) {
  try {
    await expirePendingOrders();
    const [user, generalSettings, orderSettings, commerceSettings] = await Promise.all([getCurrentUser(), getGeneralStoreSettings(), getOrderSettings(), getCommerceSettings()]);
    if (!user) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });
    if (!isStorefrontAvailable(generalSettings, user.role)) return NextResponse.json({ message: "فروشگاه در حال حاضر امکان ثبت سفارش ندارد." }, { status: 503 });
    if (user.isGuest && !generalSettings.guestCheckout) return NextResponse.json({ message: "برای ادامه خرید وارد حساب شوید." }, { status: 403 });
    if (!commerceSettings.onlinePaymentEnabled) return NextResponse.json({ message: "پرداخت آنلاین موقتاً غیرفعال است." }, { status: 503 });
    const input = addressSchema.parse(await request.json());
    const { couponCode, deliveryMethod, ...address } = input;
    if (deliveryMethod === "INSURED_SHIPPING" && !commerceSettings.insuredShippingEnabled) return NextResponse.json({ message: "ارسال بیمه‌شده در حال حاضر فعال نیست." }, { status: 422 });
    if (deliveryMethod === "STORE_PICKUP" && !commerceSettings.inStorePickupEnabled) return NextResponse.json({ message: "تحویل حضوری در حال حاضر فعال نیست." }, { status: 422 });
    const cart = await db.cart.findUnique({ where: { userId: user.id }, include: { items: { include: { product: { include: { options: true } } } } } });
    if (!cart?.items.length) return NextResponse.json({ message: "سبد خرید خالی است." }, { status: 409 });
    const needsGoldRate = cart.items.some((item) => item.product.storeIndustry === "GOLD");
    let rate = 0;
    if (needsGoldRate) {
      try {
        const gold = await getGoldPrice({ force: orderSettings.revalidateGoldAtCheckout });
        rate = Number(gold.pricePerGram18);
      } catch (error) {
        console.error("[checkout] Gold price is unavailable; checkout was stopped.", error);
        return NextResponse.json(
          { message: "نرخ لحظه‌ای طلا موقتاً در دسترس نیست. سبد خرید شما حفظ شده؛ لطفاً کمی بعد دوباره تلاش کنید." },
          { status: 503 },
        );
      }
    }
    const lines: CheckoutLine[] = cart.items.map((item: ItemWithProduct) => {
      const p = item.product;
      if (item.quantity > orderSettings.maxOrderItemQuantity) throw new Error(`حداکثر تعداد مجاز برای هر قلم ${orderSettings.maxOrderItemQuantity.toLocaleString("fa-IR")} عدد است.`);
      if (p.status !== "ACTIVE" || p.stock < item.quantity) throw new Error(`موجودی ${p.name} کافی نیست.`);
      if (!isOptionSnapshotValid(p.options, item.selectedOptions, item.quantity, p.stock)) throw new Error(`تنوع انتخاب‌شده برای ${p.name} غیرفعال یا ناموجود است.`);
      const selectedWeight = getSelectedOptionWeight(p.options, item.selectedOptions, Number(p.weightGrams));
      const parts = calculateProductPrice({
        goldPricePerGram18: rate,
        weightGrams: p.storeIndustry === "GOLD" ? selectedWeight : 0,
        purity: p.purity,
        makingFeeType: p.makingFeeType,
        makingFeeValue: Number(p.makingFeeValue),
        profitPercent: Number(p.profitPercent),
        taxPercent: Number(p.taxPercent),
      });
      const originalUnitPrice = p.storeIndustry === "GENERAL"
        ? getSelectedOptionPrice(p.options, item.selectedOptions, Number(p.fixedPrice ?? 0))
        : p.fixedPrice ? Number(p.fixedPrice) : parts.total;
      const pricing = calculateDiscountedPrice(originalUnitPrice, p);
      const unitPrice = pricing.finalPrice;
      if (unitPrice <= 0) throw new Error(`قیمت ${p.name} معتبر نیست.`);
      return { item, p, parts, originalUnitPrice, discountAmount: pricing.discountAmount, unitPrice, total: unitPrice * item.quantity };
    });
    const merchandiseAmount = lines.reduce((sum: number, line: CheckoutLine) => sum + line.total, 0);
    if (merchandiseAmount < orderSettings.minimumOrderAmount) return NextResponse.json({ message: `حداقل مبلغ سفارش ${orderSettings.minimumOrderAmount.toLocaleString("fa-IR")} ریال است.` }, { status: 422 });
    const subtotal = lines.reduce((sum: number, line: CheckoutLine) => sum + line.originalUnitPrice * line.item.quantity, 0);
    const productDiscount = lines.reduce((sum: number, line: CheckoutLine) => sum + line.discountAmount * line.item.quantity, 0);
    const tax = lines.reduce((sum: number, line: CheckoutLine) => sum + line.parts.tax * line.item.quantity, 0);
    const preparationDays = Math.max(...lines.map((line) => line.p.preparationDays));
    const order = await db.$transaction(async (tx) => {
      const shippingFee = baseShippingFee(commerceSettings, merchandiseAmount, deliveryMethod);
      const promotions = await resolveCheckoutPromotions(tx, { userId: user.id, couponCode, merchandiseAmount, shippingFee, city: address.city });
      const shipping = Math.max(0, shippingFee - promotions.shippingDiscount);
      const total = merchandiseAmount - promotions.promotionDiscount + shipping;
      if (total <= 0) throw new Error("مبلغ نهایی سفارش معتبر نیست.");
      const createdAt = new Date();
      const created = await tx.order.create({
        data: {
          orderNumber: `${orderSettings.orderNumberPrefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
          userId: user.id,
          createdAt,
          expiresAt: orderSettings.orderExpirationStart === "CREATED_AT" ? orderExpiresAt(orderSettings, createdAt) : null,
          deliveryMethod,
          preparationDaysSnapshot: preparationDays,
          estimatedReadyAt: estimatedReadyAt(preparationDays, createdAt),
          goldPriceSnapshot: rate,
          subtotal,
          productDiscount,
          promotionDiscount: promotions.promotionDiscount,
          discount: productDiscount + promotions.promotionDiscount,
          shipping,
          shippingDiscount: promotions.shippingDiscount,
          tax,
          total,
          shippingAddress: address,
          items: {
            create: lines.map(({ item, p, parts, originalUnitPrice, discountAmount, unitPrice, total: lineTotal }: CheckoutLine) => ({
              productId: p.id, sku: p.sku, name: p.name, selectedOptions: optionEntries(item.selectedOptions).length ? Object.fromEntries(optionEntries(item.selectedOptions)) : undefined, quantity: item.quantity,
              storeIndustry: p.storeIndustry,
              weightGrams: getSelectedOptionWeight(p.options, item.selectedOptions, Number(p.weightGrams)), purity: p.purity, makingFee: parts.makingFee,
              profit: parts.profit, tax: parts.tax, originalUnitPrice, discountAmount, unitPrice, total: lineTotal,
            })),
          },
          promotionRedemptions: promotions.applications.length ? {
            create: promotions.applications.map((promotion) => ({
              promotionId: promotion.promotionId,
              userId: user.id,
              discountAmount: promotion.discountAmount,
              shippingDiscount: promotion.shippingDiscount,
              snapshot: promotion.snapshot,
            })),
          } : undefined,
        },
      });
      if (promotions.rewardId) {
        const reserved = await tx.promotionReward.updateMany({ where: { id: promotions.rewardId, redeemedOrderId: null }, data: { redeemedOrderId: created.id } });
        if (reserved.count !== 1) throw new PromotionValidationError("پاداش خرید بعدی هم‌زمان در سفارش دیگری استفاده شده است.");
      }
      return created;
    });
    try {
      const paymentRequest = await getPaymentProvider().request({ amount: Number(order.total), orderId: order.id, callbackUrl: `${env.APP_URL}/api/payment/callback`, description: `پرداخت سفارش ${order.orderNumber}` });
      await db.$transaction(async (transaction) => {
        const paymentStartedAt = new Date();
        await transaction.payment.create({ data: { orderId: order.id, provider: env.PAYMENT_PROVIDER, authority: paymentRequest.authority, amount: order.total, status: "PENDING" } });
        if (orderSettings.orderExpirationStart === "PAYMENT_STARTED_AT") await transaction.order.update({ where: { id: order.id }, data: { expiresAt: orderExpiresAt(orderSettings, paymentStartedAt) } });
      });
      try { await sendAutomatedSms("orderCreated", input.phone, { orderNumber: order.orderNumber }); } catch (smsError) { console.error("[sms] Order-created notification failed.", smsError); }
      return NextResponse.json({ redirectUrl: paymentRequest.redirectUrl });
    } catch (error) {
      await db.$transaction(async (tx) => {
        await tx.promotionReward.updateMany({ where: { redeemedOrderId: order.id, redeemedAt: null }, data: { redeemedOrderId: null } });
        await tx.order.delete({ where: { id: order.id } });
      });
      throw error;
    }
  } catch (error) {
    if (error instanceof PromotionValidationError) return NextResponse.json({ message: error.message }, { status: 422 });
    if (error instanceof Error && (error.message.startsWith("موجودی") || error.message.startsWith("تنوع") || error.message.startsWith("قیمت") || error.message.startsWith("حداکثر تعداد"))) return NextResponse.json({ message: error.message }, { status: 409 });
    return apiError(error);
  }
}
