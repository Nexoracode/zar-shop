import { redirect } from "next/navigation";
import { CreditCard, MapPin, ShoppingCart } from "lucide-react";
import { AlertDescription, AlertRoot } from "@/components/hero";
import { CheckoutForm } from "@/components/checkout-form";
import { ResumeOrderCheckout } from "@/components/resume-order-checkout";
import { StandaloneTopBar } from "@/components/standalone-top-bar";
import { requireUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { lineUnitPrice } from "@/modules/products/line-pricing";
import { baseShippingFee, defaultDeliveryMethod, getCommerceSettings } from "@/modules/settings/commerce-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getOrderSettings } from "@/modules/settings/order-settings";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { resolveCheckoutPromotions } from "@/modules/promotions/service";
import { getStorefrontPaymentMethods } from "@/modules/payments/storefront-methods";
import { serializeAddress } from "@/modules/account/addresses";

export const dynamic = "force-dynamic";

const steps = <div className="mb-7 flex items-center justify-center gap-2 text-xs sm:gap-4 sm:text-sm" aria-label="مراحل خرید"><span className="flex items-center gap-2 text-[var(--muted)]"><ShoppingCart size={18} />سبد خرید</span><span className="h-px w-8 bg-[var(--border)] sm:w-16" /><strong className="flex items-center gap-2 text-[var(--brand-primary)]"><MapPin size={18} />ارسال و پرداخت</strong><span className="h-px w-8 bg-[var(--border)] sm:w-16" /><span className="flex items-center gap-2 text-[var(--muted)]"><CreditCard size={18} />تکمیل خرید</span></div>;

export default async function CheckoutPage() {
  const user = await requireUser();
  await expirePendingOrders();

  // A pending order's address, coupon and price are locked in at creation and must never be
  // recomputed; resuming its payment reuses this same page and layout, but with an order
  // already on file it must never fall through into building a brand new one from the cart.
  const pendingOrder = await db.order.findFirst({
    where: { userId: user.id, status: "PENDING_PAYMENT", expirationHandledAt: null, payments: { none: { status: { in: ["SUCCESS", "REFUNDED"] } } } },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1, select: { provider: true } }, promotionRedemptions: { select: { discountAmount: true, shippingDiscount: true, snapshot: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (pendingOrder) {
    const [settings, paymentMethods, orderSettings] = await Promise.all([getGeneralStoreSettings(), getStorefrontPaymentMethods(), getOrderSettings()]);
    const address = pendingOrder.shippingAddress as { title: string; recipient: string; phone: string; province: string; city: string; postalCode: string; addressLine: string; plaque: string; unit: string | null };
    const quote = {
      subtotal: Number(pendingOrder.subtotal),
      productDiscount: Number(pendingOrder.productDiscount),
      promotionDiscount: Number(pendingOrder.promotionDiscount),
      shipping: Number(pendingOrder.shipping),
      shippingDiscount: Number(pendingOrder.shippingDiscount),
      total: Number(pendingOrder.total),
      applications: pendingOrder.promotionRedemptions.map((redemption) => {
        const snapshot = redemption.snapshot as { title?: string; code?: string | null };
        return { title: snapshot.title ?? "", code: snapshot.code ?? null };
      }),
    };
    const itemCount = await db.orderItem.aggregate({ where: { orderId: pendingOrder.id }, _sum: { quantity: true } }).then((result) => result._sum.quantity ?? 0);
    return (
      <>
      <StandaloneTopBar backHref="/cart" backLabel="بازگشت به سبد خرید" />
      <main className="bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-[1280px]">
          {steps}
          <div className="mb-6"><h1 className="m-0 text-xl font-bold sm:text-2xl">تکمیل سفارش</h1><p className="mb-0 mt-2 text-sm text-[var(--muted)]">سفارش <b dir="ltr">{pendingOrder.orderNumber}</b> قبلاً ثبت شده؛ فقط پرداخت آن باقی مانده است.</p></div>
          <ResumeOrderCheckout
            orderId={pendingOrder.id}
            orderNumber={pendingOrder.orderNumber}
            address={address}
            quote={quote}
            currency={settings.currency}
            itemCount={itemCount}
            methods={paymentMethods}
            defaultPaymentProvider={pendingOrder.payments[0]?.provider ?? null}
            expiresAt={pendingOrder.expiresAt?.toISOString() ?? null}
            warningMinutes={orderSettings.orderWarningMinutes}
          />
        </div>
      </main>
      </>
    );
  }

  const [cart, gold, settings, commerceSettings, paymentMethods, addresses] = await Promise.all([
    db.cart.findUnique({ where: { userId: user.id }, include: { items: { include: { product: { include: { variants: true } } } } } }),
    getGoldPriceForDisplay(),
    getGeneralStoreSettings(),
    getCommerceSettings(),
    getStorefrontPaymentMethods(),
    db.address.findMany({ where: { userId: user.id, type: "SHIPPING" }, orderBy: [{ isDefault: "desc" }, { lastUsedAt: "desc" }, { createdAt: "desc" }], include: { provinceRef: true, cityRef: true } }),
  ]);
  if (!cart?.items.length) redirect("/cart");
  const items = cart.items.filter((item) => item.product.storeIndustry === settings.industry);
  if (!items.length) redirect("/cart");
  const needsGoldRate = items.some((item) => item.product.storeIndustry === "GOLD" && item.product.fixedPrice === null);
  const rate = gold?.pricePerGram18 ?? null;

  if (needsGoldRate && rate === null) return <><StandaloneTopBar backHref="/cart" backLabel="بازگشت به سبد خرید" /><main className="px-4 py-12 sm:px-6"><div className="mx-auto max-w-3xl"><AlertRoot status="warning"><AlertDescription>نرخ لحظه‌ای طلا موقتاً در دسترس نیست. سفارش شما ثبت نشده و سبد خرید محفوظ است.</AlertDescription></AlertRoot></div></main></>;

  const prices = items.map((item) => {
    const product = item.product;
    const pricing = lineUnitPrice(product, item.selectionKey, rate);
    return { quantity: item.quantity, original: pricing?.originalPrice ?? 0, final: pricing?.finalPrice ?? 0 };
  });
  const subtotal = prices.reduce((sum, item) => sum + item.original * item.quantity, 0);
  const merchandiseAmount = prices.reduce((sum, item) => sum + item.final * item.quantity, 0);
  const productDiscount = subtotal - merchandiseAmount;
  const deliveryMethod = defaultDeliveryMethod(commerceSettings);
  const shippingFee = baseShippingFee(commerceSettings, merchandiseAmount, deliveryMethod);
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  const promotions = await resolveCheckoutPromotions(db, { userId: user.id, merchandiseAmount, shippingFee, city: defaultAddress?.cityRef?.name ?? defaultAddress?.city ?? "" });
  const shipping = Math.max(0, shippingFee - promotions.shippingDiscount);
  const initialQuote = { subtotal, productDiscount, merchandiseAmount, promotionDiscount: promotions.promotionDiscount, shipping, shippingDiscount: promotions.shippingDiscount, total: merchandiseAmount - promotions.promotionDiscount + shipping, applications: promotions.applications.map((item) => ({ title: item.title, code: item.code, discountAmount: item.discountAmount, shippingDiscount: item.shippingDiscount })) };
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
    <StandaloneTopBar backHref="/cart" backLabel="بازگشت به سبد خرید" />
    <main className="bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-[1280px]">
        {steps}
        <div className="mb-6"><h1 className="m-0 text-xl font-bold sm:text-2xl">تکمیل سفارش</h1><p className="mb-0 mt-2 text-sm text-[var(--muted)]">نشانی، تخفیف و روش پرداخت را بررسی کنید.</p></div>
        <CheckoutForm settings={commerceSettings} paymentMethods={paymentMethods} currency={settings.currency} itemCount={itemCount} initialQuote={initialQuote} initialAddresses={addresses.map(serializeAddress)} user={{ firstName: user.firstName, lastName: user.lastName, phone: user.phone }} />
      </div>
    </main>
    </>
  );
}
