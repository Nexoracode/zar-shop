import { requireUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import type { Order } from "@generated/prisma/client";
import { Button, Card, Table, TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRow, TableScrollContainer } from "@/components/hero";
import { AdminStatusBadge } from "@/components/admin-ui";
import { orderStatusLabels, orderStatusTones } from "@/modules/admin/labels";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getOrderSettings } from "@/modules/settings/order-settings";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { OrderExpiryCountdown } from "@/components/order-expiry-countdown";

export default async function AccountPage() {
  const user = await requireUser();
  await expirePendingOrders();
  const [orders, settings, orderSettings] = await Promise.all([db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }), getGeneralStoreSettings(), getOrderSettings()]);
  const displayName = user.isGuest ? "خریدار مهمان" : user.firstName ? `${user.firstName} ${user.lastName ?? ""}` : user.email;

  return (
    <main className="px-5 py-12 sm:px-6 sm:py-[86px]">
      <div className="mx-auto w-full max-w-[1240px]">
        {/* Panel head */}
        <div className="mb-6 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <span className="inline-block text-[var(--brand-accent)] text-[0.78rem] font-bold tracking-[0.03em] mb-[5px]">حساب مشتری</span>
            <h1 className="mt-0 mb-0">{displayName}</h1>
          </div>
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="outline" className="min-h-[46px] px-6">
              خروج
            </Button>
          </form>
        </div>

        {/* Stats */}
        <div className="mt-[22px] grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-[14px]">
          {[
            { val: orders.length.toLocaleString("fa-IR"), label: "سفارش ثبت‌شده" },
            { val: orders.filter((o: Order) => o.status === "DELIVERED").length.toLocaleString("fa-IR"), label: "تحویل‌شده" },
            { val: user.phone ?? "—", label: "شماره تماس" },
            { val: user.isGuest ? "بدون ثبت‌نام" : user.email, label: "ایمیل حساب", small: true },
          ].map(({ val, label, small }) => (
            <Card key={label} variant="secondary" className="rounded-2xl border border-[#e7e6e2] bg-white p-[21px]">
              <strong className={`block font-bold ${small ? "text-[1rem]" : "text-2xl"}`}>{val}</strong>
              <span className="text-[#747982] text-[0.85rem]">{label}</span>
            </Card>
          ))}
        </div>

        {/* Orders */}
        <div className="flex items-end justify-between gap-6 mt-[45px] mb-[34px]">
          <h2 className="m-0">سفارش‌های من</h2>
        </div>

        <Table><TableScrollContainer><TableContent aria-label="سفارش‌های من" className="w-full min-w-[700px]"><TableHeader>{["شماره سفارش", "مبلغ", "وضعیت", "تاریخ"].map((h, index) => <TableColumn id={h} key={h} isRowHeader={index === 0} className="bg-[#f8f7f4] px-4 py-[14px] text-right text-[0.82rem] text-[#747982]">{h}</TableColumn>)}</TableHeader><TableBody>
              {orders.map((o: Order) => (
                <TableRow id={o.id} key={o.id}>
                  <TableCell className="px-4 py-[14px]">{o.orderNumber}</TableCell>
                  <TableCell className="px-4 py-[14px]">{formatMoney(o.total.toString(), settings.currency)}</TableCell>
                  <TableCell className="px-4 py-[14px]"><AdminStatusBadge tone={orderStatusTones[o.status]}>{orderStatusLabels[o.status]}</AdminStatusBadge>{orderSettings.showOrderCountdown && o.status === "PENDING_PAYMENT" && o.expiresAt ? <OrderExpiryCountdown expiresAt={o.expiresAt.toISOString()} warningMinutes={orderSettings.orderWarningMinutes} /> : null}</TableCell>
                  <TableCell className="px-4 py-[14px]">{formatDate(o.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody></TableContent></TableScrollContainer></Table>
      </div>
    </main>
  );
}
