import Link from "next/link";
import { BadgePercent, ChevronLeft, PackageOpen, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { AlertDescription, AlertRoot, Card, ChipLabel, ChipRoot } from "@/components/hero";
import { getCurrentUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { formatMoney } from "@/lib/format";
import { CartItemCard } from "@/components/cart-item-card";
import type { Prisma } from "@generated/prisma/client";
import { optionEntries } from "@/modules/products/options";
import { lineUnitPrice } from "@/modules/products/line-pricing";
import { findVariant, variantPricing } from "@/modules/products/variants";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getCommerceSettings } from "@/modules/settings/commerce-settings";
import { getOrderSettings } from "@/modules/settings/order-settings";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { PendingOrderCartNotice } from "@/components/pending-order-cart-notice";

type CartItemRow = Prisma.CartItemGetPayload<{ include: { product: { include: { variants: true; media: { include: { media: true } } } } } }>;

export const dynamic = "force-dynamic";

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
    const selectedWeight = variantPricing(item.selectionKey ? findVariant(product.variants, item.selectionKey) : null, product).weightGrams;
    return { item, selectedWeight, pricing };
  });
  const priceUnavailable = pricedItems.some((line) => line.pricing === null);
  const subtotal = priceUnavailable ? null : pricedItems.reduce((sum, line) => sum + line.pricing!.originalPrice * line.item.quantity, 0);
  const merchandiseTotal = priceUnavailable ? null : pricedItems.reduce((sum, line) => sum + line.pricing!.finalPrice * line.item.quantity, 0);
  const productDiscount = subtotal === null || merchandiseTotal === null ? null : subtotal - merchandiseTotal;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const preparationDays = items.length ? Math.max(...items.map((item) => item.product.preparationDays)) : 0;
  const remainingForFreeShipping = merchandiseTotal !== null && commerceSettings.freeShippingThreshold !== null ? Math.max(0, commerceSettings.freeShippingThreshold - merchandiseTotal) : null;

  return (
    <main className="bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="m-0 text-xl font-bold sm:text-2xl">سبد خرید شما</h1>
            <p className="mb-0 mt-2 text-sm text-[var(--muted)]">{itemCount ? `${itemCount.toLocaleString("fa-IR")} کالا در سبد خرید` : "هنوز کالایی انتخاب نکرده‌اید"}</p>
          </div>
          {hasGoldItems && <ChipRoot variant="soft" className="bg-[var(--surface-secondary)] text-[var(--brand-accent)]"><ChipLabel>نرخ مبنا: {rate === null ? "موقتاً در دسترس نیست" : formatMoney(rate.toString(), settings.currency)}</ChipLabel></ChipRoot>}
        </div>

        {pendingOrder ? <PendingOrderCartNotice orderNumber={pendingOrder.orderNumber} total={formatMoney(pendingOrder.total.toString(), settings.currency)} expiresAt={pendingOrder.expiresAt?.toISOString() ?? null} warningMinutes={orderSettings.orderWarningMinutes} expirationAction={orderSettings.orderExpirationAction} /> : null}

        {!items.length ? (
          <Card variant="secondary" className="grid min-h-[360px] place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
            <div><span className="mx-auto grid size-24 place-items-center rounded-full bg-[var(--surface-secondary)] text-[var(--muted)]"><PackageOpen size={42} strokeWidth={1.4} /></span><h2 className="mb-0 mt-6 text-lg font-bold">سبد خرید شما خالی است</h2><p className="mx-auto mb-0 mt-2 max-w-md text-sm leading-7 text-[var(--muted)]">می‌توانید برای مشاهده محصولات و انتخاب کالای موردنظر به فروشگاه برگردید.</p><Link href="/products" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-6 text-sm font-bold text-[var(--brand-primary-foreground)]">مشاهده محصولات<ChevronLeft size={17} /></Link></div>
          </Card>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm" aria-label="اقلام سبد خرید">
              <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4"><ShoppingCart size={20} className="text-[var(--brand-primary)]" /><strong className="text-sm">کالاهای سبد خرید</strong><span className="text-xs text-[var(--muted)]">({itemCount.toLocaleString("fa-IR")} کالا)</span></div>
              {pricedItems.map(({ item, selectedWeight, pricing }) => {
                const product = item.product;
                const cover = product.media[0]?.media;
                return pricing ? <CartItemCard key={item.id} id={item.id} name={product.name} slug={product.slug} imageUrl={cover?.type === "IMAGE" ? cover.url : null} imageAlt={cover?.alt ?? product.name} quantity={item.quantity} maxQuantity={Math.min(orderSettings.maxOrderItemQuantity, product.stock)} optionSummary={optionEntries(item.selectedOptions).map(([name, value]) => `${name}: ${value}`)} weight={product.storeIndustry === "GOLD" ? `${Number(selectedWeight).toLocaleString("fa-IR", { maximumFractionDigits: 3 })} گرم` : null} unitPrice={pricing.finalPrice} originalUnitPrice={pricing.isActive ? pricing.originalPrice : null} currency={settings.currency} preparationDays={product.preparationDays} /> : <AlertRoot key={item.id} status="warning" className="m-4"><AlertDescription>قیمت «{product.name}» موقتاً قابل محاسبه نیست.</AlertDescription></AlertRoot>;
              })}
            </section>

            {priceUnavailable || subtotal === null || merchandiseTotal === null ? <AlertRoot status="warning"><AlertDescription>نرخ لحظه‌ای طلا موقتاً در دسترس نیست. سبد خرید شما حفظ شده است.</AlertDescription></AlertRoot> : <aside className="grid gap-4 lg:sticky lg:top-24">
              <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <dl className="m-0 grid gap-4 text-sm"><div className="flex items-center justify-between gap-4 text-[var(--muted)]"><dt>قیمت کالاها ({itemCount.toLocaleString("fa-IR")})</dt><dd>{formatMoney(subtotal, settings.currency)}</dd></div>{productDiscount! > 0 && <div className="flex items-center justify-between gap-4 font-bold text-[var(--danger)]"><dt>تخفیف کالاها</dt><dd>{formatMoney(productDiscount!, settings.currency)}</dd></div>}<div className="flex items-center justify-between gap-4 border-t border-[var(--border)] pt-4 font-bold"><dt>جمع سبد خرید</dt><dd>{formatMoney(merchandiseTotal, settings.currency)}</dd></div></dl>
                <p className="mb-0 mt-4 text-[11px] leading-6 text-[var(--muted)]">هزینه ارسال بر اساس نشانی و تخفیف‌های فعال در مرحله بعد محاسبه می‌شود.</p>
                <Link href="/checkout" className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-5 text-sm font-bold text-[var(--brand-primary-foreground)] shadow-sm transition hover:brightness-110">ادامه فرایند خرید<ChevronLeft size={18} /></Link>
              </Card>
              {remainingForFreeShipping !== null && <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs leading-6 text-[var(--muted)]"><span className="flex items-center gap-2 font-bold text-[var(--foreground)]"><Truck size={17} />ارسال سفارش</span><p className="mb-0 mt-2">{remainingForFreeShipping === 0 ? "سفارش شما مشمول ارسال رایگان است." : `${formatMoney(remainingForFreeShipping, settings.currency)} تا ارسال رایگان فاصله دارید.`}</p><p className="mb-0 mt-1">آماده‌سازی تا {preparationDays.toLocaleString("fa-IR")} روز کاری</p></Card>}
              <div className="flex items-center gap-2 px-2 text-[11px] text-[var(--muted)]"><ShieldCheck size={16} />پرداخت امن و حفاظت از اطلاعات خرید</div>
              {productDiscount! > 0 && <div className="flex items-center gap-2 px-2 text-[11px] font-bold text-[var(--danger)]"><BadgePercent size={16} />{formatMoney(productDiscount!, settings.currency)} سود شما از تخفیف کالاها</div>}
            </aside>}
          </div>
        )}
      </div>
    </main>
  );
}
