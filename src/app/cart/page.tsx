import Link from "next/link";
import { ChevronLeft, PackageOpen, ShoppingCart } from "lucide-react";
import { Card, ChipLabel, ChipRoot } from "@/components/hero";
import { InlineAlert } from "@/components/inline-alert";
import { getCurrentUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { formatMoney } from "@/lib/format";
import { CartItemCard } from "@/components/cart-item-card";
import { CartLiveCount, CartLiveHeadline, CartLiveProvider, CartLiveSummary } from "@/components/cart-live";
import type { CartLiveLine } from "@/components/cart-live";
import type { Prisma } from "@generated/prisma/client";
import { optionEntries } from "@/modules/products/options";
import { lineUnitPrice } from "@/modules/products/line-pricing";
import { findVariant, variantMaxQuantity, variantPricing } from "@/modules/products/variants";
import { isCartLineUnavailable } from "@/modules/cart/line-availability";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getCommerceSettings } from "@/modules/settings/commerce-settings";
import { getOrderSettings } from "@/modules/settings/order-settings";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { PendingOrderCartNotice } from "@/components/pending-order-cart-notice";

type CartItemRow = Prisma.CartItemGetPayload<{ include: { product: { include: { variants: true; media: { include: { media: true } } } } } }>;

// Per-user cart contents; no static-shell value. Deferred from full Cache Components
// conversion — see the caching migration plan for scope.
export const instant = false;

export default async function CartPage() {
  const user = await getCurrentUser();
  if (user) await expirePendingOrders();
  const [cart, gold, settings, commerceSettings, orderSettings, pendingOrder] = await Promise.all([
    user ? db.cart.findUnique({ where: { userId: user.id }, include: { items: { orderBy: { id: "asc" }, include: { product: { include: { variants: true, media: { where: { isCover: true }, include: { media: true }, take: 1 } } } } } } }) : Promise.resolve(null),
    getGoldPriceForDisplay(),
    getGeneralStoreSettings(),
    getCommerceSettings(),
    getOrderSettings(),
    user ? db.order.findFirst({ where: { userId: user.id, status: "PENDING_PAYMENT", expirationHandledAt: null, payments: { none: { status: { in: ["SUCCESS", "REFUNDED"] } } } }, select: { orderNumber: true, total: true, expiresAt: true }, orderBy: { createdAt: "desc" } }) : Promise.resolve(null),
  ]);
  const items = ((cart?.items ?? []) as CartItemRow[]).filter((item) => item.product.storeIndustry === settings.industry);
  const rate = gold?.pricePerGram18 ?? null;
  const hasGoldItems = items.some((item) => item.product.storeIndustry === "GOLD");
  const pricedItems = items.map((item) => {
    const product = item.product;
    const pricing = lineUnitPrice(product, item.selectionKey, rate);
    const variant = findVariant(product.variants, item.selectionKey);
    const selectedWeight = variantPricing(variant, product).weightGrams;
    // The combination this line was added with may have been removed or emptied since; it is kept so it can be removed, but never sold.
    const unavailable = isCartLineUnavailable(product, item.selectionKey);
    return { item, variant, selectedWeight, pricing, unavailable };
  });
  const priceUnavailable = pricedItems.some((line) => line.pricing === null);
  // Totals, counts and the free-shipping hint are worked out on the client from these lines, so they follow quantity clicks at once.
  const liveLines: CartLiveLine[] = pricedItems.map(({ item, pricing, unavailable }) => ({ id: item.id, quantity: item.quantity, finalPrice: pricing?.finalPrice ?? null, originalPrice: pricing?.originalPrice ?? null, unavailable }));

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 pb-[calc(66px+env(safe-area-inset-bottom)+16px)] pt-8 sm:px-6 sm:pt-12 lg:pb-12">
      <CartLiveProvider lines={liveLines}>
      <div className="mx-auto w-full max-w-[var(--store-content-max-width)]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="m-0 text-xl font-bold sm:text-2xl">سبد خرید شما</h1>
            <p className="mb-0 mt-2 text-sm text-[var(--muted)]"><CartLiveHeadline /></p>
          </div>
          {hasGoldItems && <ChipRoot variant="soft" className="bg-[var(--surface-secondary)] text-[var(--brand-accent)]"><ChipLabel>نرخ مبنا: {rate === null ? "موقتاً در دسترس نیست" : formatMoney(rate.toString(), settings.currency)}</ChipLabel></ChipRoot>}
        </div>

        {pendingOrder ? <PendingOrderCartNotice orderNumber={pendingOrder.orderNumber} total={formatMoney(pendingOrder.total.toString(), settings.currency)} expiresAt={pendingOrder.expiresAt?.toISOString() ?? null} warningMinutes={orderSettings.orderWarningMinutes} expirationAction={orderSettings.orderExpirationAction} /> : null}

        {!items.length ? (
          <Card variant="secondary" className="grid min-h-[360px] place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
            <div><span className="mx-auto grid size-24 place-items-center rounded-full bg-[var(--surface-secondary)] text-[var(--muted)]"><PackageOpen size={42} strokeWidth={1.4} /></span><h2 className="mb-0 mt-6 text-lg font-bold">سبد خرید شما خالی است</h2><p className="mx-auto mb-0 mt-2 max-w-md text-sm leading-7 text-[var(--muted)]">می‌توانید برای مشاهده محصولات و انتخاب کالای موردنظر به فروشگاه برگردید.</p><Link href="/products" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-6 text-sm font-bold text-[var(--brand-primary-foreground)]">مشاهده محصولات<ChevronLeft size={17} /></Link></div>
          </Card>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm" aria-label="اقلام سبد خرید">
              <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4"><ShoppingCart size={20} className="text-[var(--brand-primary)]" /><strong className="text-sm">کالاهای سبد خرید</strong><span className="text-xs text-[var(--muted)]">(<CartLiveCount /> کالا)</span></div>
              {pricedItems.map(({ item, variant, selectedWeight, pricing, unavailable }) => {
                const product = item.product;
                const cover = product.media[0]?.media;
                return pricing ? <CartItemCard key={item.id} id={item.id} name={product.name} slug={product.slug} imageUrl={cover?.type === "IMAGE" ? cover.url : null} imageAlt={cover?.alt ?? product.name} maxQuantity={variantMaxQuantity(variant, orderSettings.maxOrderItemQuantity)} optionSummary={optionEntries(item.selectedOptions).map(([name, value]) => `${name}: ${value}`)} weight={product.storeIndustry === "GOLD" ? `${Number(selectedWeight).toLocaleString("fa-IR", { maximumFractionDigits: 3 })} گرم` : null} unitPrice={pricing.finalPrice} originalUnitPrice={pricing.isActive ? pricing.originalPrice : null} unavailable={unavailable} discountEndsAt={pricing.discountEndsAt ? pricing.discountEndsAt.toISOString() : null} currency={settings.currency} preparationDays={variant?.preparationDays ?? product.preparationDays} /> : <InlineAlert key={item.id} status="warning" className="m-4">قیمت «{product.name}» موقتاً قابل محاسبه نیست.</InlineAlert>;
              })}
            </section>

            {priceUnavailable ? <InlineAlert status="warning">نرخ لحظه‌ای طلا موقتاً در دسترس نیست. سبد خرید شما حفظ شده است.</InlineAlert> : <CartLiveSummary currency={settings.currency} freeShippingThreshold={commerceSettings.freeShippingThreshold} />}
          </div>
        )}
      </div>
      </CartLiveProvider>
    </main>
  );
}
