import { isCartLineUnavailable } from "@/modules/cart/line-availability";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { CheckoutSteps } from "@/components/checkout-steps";
import { InlineAlert } from "@/components/inline-alert";
import { ResumeOrderCheckout } from "@/components/resume-order-checkout";
import { StandaloneTopBar } from "@/components/standalone-top-bar";
import { requireUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { lineUnitPrice } from "@/modules/products/line-pricing";
import { optionEntries } from "@/modules/products/options";
import { loadOptionColors } from "@/modules/products/option-colors";
import type { CheckoutItem } from "@/components/checkout-items";
import { baseShippingFee, defaultDeliveryMethod, getCommerceSettings } from "@/modules/settings/commerce-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getOrderSettings } from "@/modules/settings/order-settings";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { resolveCheckoutPromotions } from "@/modules/promotions/service";
import { getCheckoutPaymentMethods } from "@/modules/payments/storefront-methods";
import { serializeAddress } from "@/modules/account/addresses";
import { getWalletSettings } from "@/modules/settings/wallet-settings";
import { ensureWallet } from "@/modules/wallet/wallet";

// Per-user checkout; no static-shell value. Deferred from full Cache Components conversion —
// see the caching migration plan for scope.
export const instant = false;


export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ resume?: string }> }) {
  const user = await requireUser();
  const { resume } = await searchParams;
  await expirePendingOrders();

  // A pending order's address, coupon and price are locked in at creation and must never be
  // recomputed; resuming its payment reuses this same page and layout, but with an order
  // already on file it must never fall through into building a brand new one from the cart.
  const pendingOrder = await db.order.findFirst({
    where: { userId: user.id, status: "PENDING_PAYMENT", expirationHandledAt: null, payments: { none: { provider: { not: "wallet" }, status: { in: ["SUCCESS", "REFUNDED"] } } } },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1, select: { provider: true } }, promotionRedemptions: { select: { discountAmount: true, shippingDiscount: true, snapshot: true } } },
    orderBy: { createdAt: "desc" },
  });
  // Coming here with things in the cart is a new order, even while another waits for payment: the waiting
  // one is resumed only when asked for (`?resume=1`, from its own links) or when there is nothing else to buy.
  const cartLineCount = pendingOrder && !resume ? await db.cartItem.count({ where: { cart: { userId: user.id } } }) : 0;
  if (pendingOrder && (resume || cartLineCount === 0)) {
    const [settings, paymentMethods, orderSettings] = await Promise.all([getGeneralStoreSettings(), getCheckoutPaymentMethods(), getOrderSettings()]);
    const address = pendingOrder.shippingAddress as { title: string; recipient: string; phone: string; province: string; city: string; postalCode: string; addressLine: string; plaque: string; unit: string | null };
    const quote = {
      subtotal: Number(pendingOrder.subtotal),
      productDiscount: Number(pendingOrder.productDiscount),
      promotionDiscount: Number(pendingOrder.promotionDiscount),
      shipping: Number(pendingOrder.shipping),
      shippingDiscount: Number(pendingOrder.shippingDiscount),
      total: Number(pendingOrder.total),
      walletApplied: Number(pendingOrder.walletAmount),
      applications: pendingOrder.promotionRedemptions.map((redemption) => {
        const snapshot = redemption.snapshot as { title?: string; code?: string | null };
        return { title: snapshot.title ?? "", code: snapshot.code ?? null };
      }),
    };
    const orderItems = await db.orderItem.findMany({ where: { orderId: pendingOrder.id }, orderBy: { id: "asc" }, select: { id: true, productId: true, name: true, quantity: true, selectedOptions: true, unitPrice: true, originalUnitPrice: true } });
    const orderProducts = await db.product.findMany({ where: { id: { in: orderItems.flatMap((item) => item.productId ? [item.productId] : []) } }, select: { id: true, slug: true, media: { where: { isCover: true }, take: 1, select: { media: { select: { type: true, url: true, alt: true } } } } } });
    const itemCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const resumeOptionColors = await loadOptionColors(orderItems.map((item) => item.selectedOptions));
    const resumeItems: CheckoutItem[] = orderItems.map((item) => {
      const product = orderProducts.find((candidate) => candidate.id === item.productId);
      const cover = product?.media[0]?.media;
      return {
        id: item.id,
        name: item.name,
        slug: product?.slug ?? null,
        imageUrl: cover?.type === "IMAGE" ? cover.url : null,
        imageAlt: cover?.alt ?? item.name,
        quantity: item.quantity,
        optionSummary: optionEntries(item.selectedOptions).map(([name, value]) => `${name}: ${value}`),
        optionColors: resumeOptionColors,
        unitPrice: Number(item.unitPrice),
        originalUnitPrice: Number(item.originalUnitPrice) > Number(item.unitPrice) ? Number(item.originalUnitPrice) : null,
      };
    });
    return (
      <>
      <StandaloneTopBar backHref="/cart" backLabel="سبد خرید" />
      <main className="min-h-[calc(100dvh-4rem)] bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-[var(--store-content-max-width)]">
          <CheckoutSteps />
          <div className="mb-6"><h1 className="m-0 text-xl font-bold sm:text-2xl">تکمیل سفارش</h1><p className="mb-0 mt-2 text-sm text-[var(--muted)]">سفارش <b dir="ltr">{pendingOrder.orderNumber}</b> قبلاً ثبت شده؛ فقط پرداخت آن باقی مانده است.</p></div>
          <ResumeOrderCheckout
            orderId={pendingOrder.id}
            orderNumber={pendingOrder.orderNumber}
            address={address}
            quote={quote}
            currency={settings.currency}
            itemCount={itemCount}
            items={resumeItems}
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

  const [cart, gold, settings, commerceSettings, paymentMethods, addresses, walletSettings] = await Promise.all([
    db.cart.findUnique({ where: { userId: user.id }, include: { items: { orderBy: { id: "asc" }, include: { product: { include: { variants: true, media: { where: { isCover: true }, include: { media: true }, take: 1 } } } } } } }),
    getGoldPriceForDisplay(),
    getGeneralStoreSettings(),
    getCommerceSettings(),
    getCheckoutPaymentMethods(),
    db.address.findMany({ where: { userId: user.id, type: "SHIPPING" }, orderBy: [{ isDefault: "desc" }, { lastUsedAt: "desc" }, { createdAt: "desc" }], include: { provinceRef: true, cityRef: true } }),
    getWalletSettings(),
  ]);
  const walletUsable = !user.isGuest && walletSettings.walletEnabled && walletSettings.walletCheckoutEnabled;
  const walletBalance = walletUsable ? Math.floor(Number((await ensureWallet(db, user.id)).balance)) : 0;
  if (!cart?.items.length) redirect("/cart");
  const items = cart.items.filter((item) => item.product.storeIndustry === settings.industry);
  if (!items.length) redirect("/cart");
  // Lines that can no longer be bought are still listed (so nothing seems to vanish) but are never priced into the order.
  const lines = items.map((item) => ({ item, unavailable: isCartLineUnavailable(item.product, item.selectionKey) }));
  const payableItems = lines.filter((line) => !line.unavailable).map((line) => line.item);
  if (!payableItems.length) redirect("/cart");
  const needsGoldRate = payableItems.some((item) => item.product.storeIndustry === "GOLD" && item.product.fixedPrice === null);
  const rate = gold?.pricePerGram18 ?? null;

  if (needsGoldRate && rate === null) return <><StandaloneTopBar backHref="/cart" backLabel="سبد خرید" /><main className="min-h-[calc(100dvh-4rem)] bg-[var(--background)] px-4 py-12 sm:px-6"><div className="mx-auto max-w-3xl"><InlineAlert status="warning">نرخ لحظه‌ای طلا موقتاً در دسترس نیست. سفارش شما ثبت نشده و سبد خرید محفوظ است.</InlineAlert></div></main></>;

  const linePrices = lines.map(({ item, unavailable }) => ({ item, unavailable, pricing: lineUnitPrice(item.product, item.selectionKey, rate) }));
  const prices = linePrices.filter((line) => !line.unavailable).map(({ item, pricing }) => ({ quantity: item.quantity, original: pricing?.originalPrice ?? 0, final: pricing?.finalPrice ?? 0, productId: item.product.id, categoryId: item.product.categoryId }));
  const optionColors = await loadOptionColors(linePrices.map(({ item }) => item.selectedOptions));
  const checkoutItems: CheckoutItem[] = linePrices.map(({ item, unavailable, pricing }) => {
    const product = item.product;
    const cover = product.media[0]?.media;
    const original = pricing?.originalPrice ?? 0;
    const final = pricing?.finalPrice ?? 0;
    return {
      id: item.id,
      name: product.name,
      slug: product.slug,
      imageUrl: cover?.type === "IMAGE" ? cover.url : null,
      imageAlt: cover?.alt ?? product.name,
      quantity: item.quantity,
      optionSummary: optionEntries(item.selectedOptions).map(([name, value]) => `${name}: ${value}`),
      optionColors,
      unitPrice: final,
      originalUnitPrice: original > final ? original : null,
      unavailable,
    };
  });
  const subtotal = prices.reduce((sum, item) => sum + item.original * item.quantity, 0);
  const merchandiseAmount = prices.reduce((sum, item) => sum + item.final * item.quantity, 0);
  const productDiscount = subtotal - merchandiseAmount;
  const deliveryMethod = defaultDeliveryMethod(commerceSettings);
  const shippingFee = baseShippingFee(commerceSettings, merchandiseAmount, deliveryMethod);
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  const promotions = await resolveCheckoutPromotions(db, {
    userId: user.id, merchandiseAmount, shippingFee, city: defaultAddress?.cityRef?.name ?? defaultAddress?.city ?? "",
    lines: prices.map((line) => ({ productId: line.productId, categoryId: line.categoryId, lineTotal: line.final * line.quantity })),
  });
  const shipping = Math.max(0, shippingFee - promotions.shippingDiscount);
  const total = merchandiseAmount - promotions.promotionDiscount + shipping;
  const walletApplied = walletUsable ? Math.min(walletBalance, total) : 0;
  const initialQuote = { subtotal, productDiscount, merchandiseAmount, promotionDiscount: promotions.promotionDiscount, shipping, shippingDiscount: promotions.shippingDiscount, total, walletBalance, walletApplied, payable: total - walletApplied, applications: promotions.applications.map((item) => ({ title: item.title, code: item.code, discountAmount: item.discountAmount, shippingDiscount: item.shippingDiscount })) };
  const itemCount = payableItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
    <StandaloneTopBar backHref="/cart" backLabel="سبد خرید" />
    <main className="min-h-[calc(100dvh-4rem)] bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-[var(--store-content-max-width)]">
        <CheckoutSteps />
        <div className="mb-6"><h1 className="m-0 text-xl font-bold sm:text-2xl">تکمیل سفارش</h1><p className="mb-0 mt-2 text-sm text-[var(--muted)]">نشانی، تخفیف و روش پرداخت را بررسی کنید.</p></div>
        <CheckoutForm settings={commerceSettings} paymentMethods={paymentMethods} currency={settings.currency} itemCount={itemCount} items={checkoutItems} initialQuote={initialQuote} initialAddresses={addresses.map(serializeAddress)} user={{ firstName: user.firstName, lastName: user.lastName, phone: user.phone }} wallet={{ balance: walletBalance, checkoutEnabled: walletUsable }} />
      </div>
    </main>
    </>
  );
}
