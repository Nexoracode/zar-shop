import { ChevronLeft, ShoppingBag } from "lucide-react";
import { AccountEmptyState } from "@/components/account-page-ui";
import { AdminStatusBadge } from "@/components/admin-ui";
import { OrderExpiryCountdown } from "@/components/order-expiry-countdown";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { requireUser } from "@/modules/auth/session";
import { orderStatusLabels, orderStatusTones } from "@/modules/admin/labels";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getOrderSettings } from "@/modules/settings/order-settings";

export default async function OrdersPage() {
  const user = await requireUser(); await expirePendingOrders();
  const [orders, settings, orderSettings] = await Promise.all([db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50, include: { _count: { select: { items: true } } } }), getGeneralStoreSettings(), getOrderSettings()]);
  return !orders.length ? <AccountEmptyState title="هنوز سفارشی ثبت نکرده‌اید" description="پس از خرید، سفارش‌های شما در این صفحه قابل پیگیری هستند." /> : <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"><div className="divide-y divide-[var(--border)]">{orders.map((order) => <article key={order.id} className="p-5 transition hover:bg-[var(--surface-secondary)]/40"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex flex-wrap items-center gap-3"><AdminStatusBadge tone={orderStatusTones[order.status]}>{orderStatusLabels[order.status]}</AdminStatusBadge><span className="text-xs text-[var(--muted)]">{formatDate(order.createdAt)}</span><span className="text-xs text-[var(--muted)]">کد سفارش <b dir="ltr">{order.orderNumber}</b></span></div><strong className="text-sm">{formatMoney(order.total.toString(), settings.currency)}</strong></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[var(--border)] pt-4"><span className="inline-flex items-center gap-2 text-xs text-[var(--muted)]"><ShoppingBag size={15} />{order._count.items.toLocaleString("fa-IR")} کالا</span>{orderSettings.showOrderCountdown && order.status === "PENDING_PAYMENT" && order.expiresAt ? <OrderExpiryCountdown expiresAt={order.expiresAt.toISOString()} warningMinutes={orderSettings.orderWarningMinutes} /> : <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)]">جزئیات سفارش <ChevronLeft size={15} /></span>}</div></article>)}</div></section>;
}
