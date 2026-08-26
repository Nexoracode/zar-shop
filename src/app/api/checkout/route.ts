import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { getGoldPrice } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";
import { optionEntries } from "@/modules/products/options";
import { findVariant, isVariantSnapshotValid, variantPricing } from "@/modules/products/variants";
import { getStorefrontPaymentMethods, getStorefrontPaymentProvider, storefrontPaymentMethodSchema } from "@/modules/payments/storefront-methods";
import { PaymentProviderError } from "@/modules/payments/payment-provider";
import type { Prisma } from "@generated/prisma/client";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { PromotionValidationError, resolveCheckoutPromotions } from "@/modules/promotions/service";
import { getGeneralStoreSettings, isStorefrontAvailable } from "@/modules/settings/general-settings";
import { getOrderSettings, orderExpiresAt } from "@/modules/settings/order-settings";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { baseShippingFee, defaultDeliveryMethod, estimatedReadyAt, getCommerceSettings, qualifiesForFreeShipping } from "@/modules/settings/commerce-settings";
import { chargeableCartWeight, quoteForMethod } from "@/modules/shipping/quote";
import { sendAutomatedSms } from "@/modules/communications/sms-service";
import { InventoryUnavailableError, releaseInventory, reserveInventory } from "@/modules/orders/inventory";

type ItemWithProduct = Prisma.CartItemGetPayload<{ include: { product: { include: { variants: true } } } }>;
type PriceParts = ReturnType<typeof calculateProductPrice>;
type CheckoutLine = { item: ItemWithProduct; p: ItemWithProduct["product"]; parts: PriceParts; selectedWeight: string; originalUnitPrice: number; discountAmount: number; unitPrice: number; total: number };

const checkoutSchema = z.object({
  addressId: z.string().cuid(),
  couponCode: z.string().trim().max(64).optional().default(""),
  paymentProvider: storefrontPaymentMethodSchema,
  /** Which delivery option the customer picked; its price is recomputed here, never trusted. */
  shippingMethodId: z.union([z.null(), z.string().cuid()]).default(null),
});

export async function POST(request: Request) {
  try {
    await expirePendingOrders();
    const [user, generalSettings, orderSettings, commerceSettings] = await Promise.all([getCurrentUser(), getGeneralStoreSettings(), getOrderSettings(), getCommerceSettings()]);
    if (!user) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });
    if (!isStorefrontAvailable(generalSettings, user.role)) return NextResponse.json({ message: "فروشگاه در حال حاضر امکان ثبت سفارش ندارد." }, { status: 503 });
    if (user.isGuest && !generalSettings.guestCheckout) return NextResponse.json({ message: "برای ادامه خرید وارد حساب شوید." }, { status: 403 });
    if (!commerceSettings.onlinePaymentEnabled) return NextResponse.json({ message: "پرداخت آنلاین موقتاً غیرفعال است." }, { status: 503 });
    const input = checkoutSchema.parse(await request.json());
    const { couponCode, paymentProvider, addressId, shippingMethodId } = input;
    const deliveryMethod = defaultDeliveryMethod(commerceSettings);
    const selectedAddress = await db.address.findFirst({
      where: { id: addressId, userId: user.id, type: "SHIPPING" },
      include: { provinceRef: true, cityRef: true },
    });
    if (!selectedAddress) return NextResponse.json({ message: "نشانی انتخاب‌شده معتبر نیست؛ لطفاً دوباره نشانی تحویل را انتخاب کنید." }, { status: 422 });
    const address = {
      addressId: selectedAddress.id,
      title: selectedAddress.title,
      recipientType: selectedAddress.recipientType,
      recipient: selectedAddress.recipient,
      phone: selectedAddress.phone,
      province: selectedAddress.provinceRef?.name ?? selectedAddress.province,
      city: selectedAddress.cityRef?.name ?? selectedAddress.city,
      postalCode: selectedAddress.postalCode,
      addressLine: selectedAddress.addressLine,
      plaque: selectedAddress.plaque,
      unit: selectedAddress.unit,
      floor: selectedAddress.floor,
    };
    const availableMethods = await getStorefrontPaymentMethods();
    if (!availableMethods.some((method) => method.id === paymentProvider)) return NextResponse.json({ message: "روش پرداخت انتخاب‌شده در دسترس نیست." }, { status: 422 });
    const selectedPaymentProvider = await getStorefrontPaymentProvider(paymentProvider);
    const cart = await db.cart.findUnique({ where: { userId: user.id }, include: { items: { include: { product: { include: { variants: true } } } } } });
    if (!cart?.items.length) return NextResponse.json({ message: "سبد خرید خالی است." }, { status: 409 });
    if (cart.items.some((item) => item.product.storeIndustry !== generalSettings.industry)) {
      return NextResponse.json({ message: "نوع بعضی محصولات سبد خرید با قالب فعلی فروشگاه سازگار نیست؛ لطفاً سبد خرید را بازبینی کنید." }, { status: 409 });
    }
    const needsGoldRate = cart.items.some((item) => item.product.storeIndustry === "GOLD");
    let rate = "0";
    if (needsGoldRate) {
      try {
        const gold = await getGoldPrice({ force: orderSettings.revalidateGoldAtCheckout });
        rate = gold.pricePerGram18.toString();
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
      if (!isVariantSnapshotValid(p.variants, item.selectionKey, item.quantity)) throw new Error(`تنوع انتخاب‌شده برای ${p.name} غیرفعال یا ناموجود است.`);
      const resolved = variantPricing(item.selectionKey ? findVariant(p.variants, item.selectionKey) : null, p);
      const selectedWeight = resolved.weightGrams;
      const parts = calculateProductPrice({
        goldPricePerGram18: rate,
        weightGrams: p.storeIndustry === "GOLD" ? selectedWeight : 0,
        purity: p.purity,
        makingFeeType: p.makingFeeType,
        makingFeeValue: p.makingFeeValue,
        profitPercent: p.profitPercent,
        taxPercent: p.taxPercent,
      });
      const originalUnitPrice = p.storeIndustry === "GENERAL"
        ? resolved.fixedPrice ?? 0
        : resolved.fixedPrice ?? parts.total;
      // The combination may override the amount, but the window is always the product's.
      const pricing = calculateDiscountedPrice(originalUnitPrice, { ...p, discountType: resolved.discountType, discountValue: resolved.discountValue });
      const unitPrice = pricing.finalPrice;
      if (unitPrice <= 0) throw new Error(`قیمت ${p.name} معتبر نیست.`);
      return { item, p, parts, selectedWeight, originalUnitPrice, discountAmount: pricing.discountAmount, unitPrice, total: unitPrice * item.quantity };
    });
    const merchandiseAmount = lines.reduce((sum: number, line: CheckoutLine) => sum + line.total, 0);
    if (merchandiseAmount < orderSettings.minimumOrderAmount) return NextResponse.json({ message: `حداقل مبلغ سفارش ${orderSettings.minimumOrderAmount.toLocaleString("fa-IR")} ریال است.` }, { status: 422 });
    const subtotal = lines.reduce((sum: number, line: CheckoutLine) => sum + line.originalUnitPrice * line.item.quantity, 0);
    const productDiscount = lines.reduce((sum: number, line: CheckoutLine) => sum + line.discountAmount * line.item.quantity, 0);
    const tax = lines.reduce((sum: number, line: CheckoutLine) => sum + line.parts.tax * line.item.quantity, 0);
    const preparationDays = Math.max(...lines.map((line) => line.p.preparationDays));
    const order = await db.$transaction(async (tx) => {
      const inventoryItems = lines.map(({ item, p }) => ({ productId: p.id, quantity: item.quantity, selectionKey: item.selectionKey }));
      await reserveInventory(tx, inventoryItems);
      /*
       * Priced here rather than taken from the request: the browser's number is a display, and
       * an order total has to be one the server worked out for itself.
       */
      const chosen = shippingMethodId && selectedAddress.provinceId && !qualifiesForFreeShipping(commerceSettings, merchandiseAmount)
        ? await quoteForMethod(shippingMethodId, {
          lines: [],
          weightGrams: chargeableCartWeight(lines.map(({ item, p }) => ({
            shippingWeightGrams: p.shippingWeightGrams,
            packageLengthCm: p.packageLengthCm === null ? null : Number(p.packageLengthCm),
            packageWidthCm: p.packageWidthCm === null ? null : Number(p.packageWidthCm),
            packageHeightCm: p.packageHeightCm === null ? null : Number(p.packageHeightCm),
            quantity: item.quantity,
          })), commerceSettings.defaultParcelWeightGrams),
          declaredValue: merchandiseAmount,
          destination: { provinceId: selectedAddress.provinceId, cityId: selectedAddress.cityId },
        })
        : null;
      if (shippingMethodId && !chosen && !qualifiesForFreeShipping(commerceSettings, merchandiseAmount)) {
        throw new Error("روش ارسال انتخاب‌شده برای این سفارش در دسترس نیست.");
      }
      const shippingFee = chosen ? chosen.price : baseShippingFee(commerceSettings, merchandiseAmount, deliveryMethod);
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
          inventoryReserved: true,
          goldPriceSnapshot: rate,
          subtotal,
          productDiscount,
          promotionDiscount: promotions.promotionDiscount,
          discount: productDiscount + promotions.promotionDiscount,
          shipping,
          shippingDiscount: promotions.shippingDiscount,
          shippingMethodId: chosen?.methodId ?? null,
          shippingMethodTitle: chosen?.title ?? null,
          tax,
          total,
          shippingAddress: address,
          items: {
            create: lines.map(({ item, p, parts, selectedWeight, originalUnitPrice, discountAmount, unitPrice, total: lineTotal }: CheckoutLine) => ({
              productId: p.id, sku: p.sku, name: p.name, selectionKey: item.selectionKey, selectedOptions: optionEntries(item.selectedOptions).length ? Object.fromEntries(optionEntries(item.selectedOptions)) : undefined, quantity: item.quantity,
              storeIndustry: p.storeIndustry,
              weightGrams: selectedWeight, purity: p.purity, rawGold: parts.rawGold, makingFee: parts.makingFee,
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
      await tx.address.update({ where: { id: selectedAddress.id }, data: { lastUsedAt: createdAt } });
      if (promotions.rewardId) {
        const reserved = await tx.promotionReward.updateMany({ where: { id: promotions.rewardId, redeemedOrderId: null }, data: { redeemedOrderId: created.id } });
        if (reserved.count !== 1) throw new PromotionValidationError("پاداش خرید بعدی هم‌زمان در سفارش دیگری استفاده شده است.");
      }
      return created;
    });
    try {
      const payment = await db.payment.create({ data: { orderId: order.id, provider: paymentProvider, amount: order.total, status: "INITIATED" } });
      const paymentRequest = await selectedPaymentProvider.request({
        amount: Number(order.total),
        orderId: order.id,
        callbackUrl: `${env.APP_URL}/api/payment/callback`,
        description: `پرداخت سفارش ${order.orderNumber}`,
        mobile: user.phone ?? address.phone,
        email: user.isGuest ? undefined : (user.email ?? undefined),
      });
      await db.$transaction(async (transaction) => {
        const paymentStartedAt = new Date();
        await transaction.payment.update({ where: { id: payment.id }, data: { authority: paymentRequest.authority, status: "PENDING" } });
        if (orderSettings.orderExpirationStart === "PAYMENT_STARTED_AT") await transaction.order.update({ where: { id: order.id }, data: { expiresAt: orderExpiresAt(orderSettings, paymentStartedAt) } });
        await transaction.cartItem.deleteMany({ where: { cartId: cart.id } });
      });
      try { await sendAutomatedSms("orderCreated", address.phone, { orderNumber: order.orderNumber }); } catch (smsError) { console.error("[sms] Order-created notification failed.", smsError); }
      return NextResponse.json({ redirectUrl: paymentRequest.redirectUrl });
    } catch (error) {
      await db.$transaction(async (tx) => {
        const pendingOrder = await tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
        if (pendingOrder?.inventoryReserved) await releaseInventory(tx, pendingOrder.items);
        await tx.promotionReward.updateMany({ where: { redeemedOrderId: order.id, redeemedAt: null }, data: { redeemedOrderId: null } });
        await tx.payment.deleteMany({ where: { orderId: order.id } });
        await tx.order.delete({ where: { id: order.id } });
      });
      throw error;
    }
  } catch (error) {
    if (error instanceof InventoryUnavailableError) return NextResponse.json({ message: error.message }, { status: 409 });
    if (error instanceof PromotionValidationError) return NextResponse.json({ message: error.message }, { status: 422 });
    if (error instanceof PaymentProviderError) return NextResponse.json({ message: "ارتباط با درگاه زرین‌پال برقرار نشد؛ لطفاً چند لحظه بعد دوباره تلاش کنید." }, { status: 502 });
    if (error instanceof Error && (error.message.startsWith("موجودی") || error.message.startsWith("تنوع") || error.message.startsWith("قیمت") || error.message.startsWith("حداکثر تعداد"))) return NextResponse.json({ message: error.message }, { status: 409 });
    return apiError(error);
  }
}
