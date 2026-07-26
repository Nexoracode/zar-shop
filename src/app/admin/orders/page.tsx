import Link from "next/link";
import type { Prisma } from "@generated/prisma/client";
import { OrderStatus } from "@generated/prisma/enums";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminStatusBadge, adminFieldClass } from "@/components/admin-ui";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { orderStatusLabels, orderStatusTones } from "@/modules/admin/labels";

type OrderRow = Prisma.OrderGetPayload<{ include: { user: true; _count: { select: { items: true } } } }>;
type SearchParams = Promise<{ q?: string; status?: string }>;

const statuses = Object.values(OrderStatus);

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = statuses.includes(params.status as OrderStatus) ? params.status as OrderStatus : undefined;
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(query ? {
      OR: [
        { orderNumber: { contains: query } },
        { user: { is: { OR: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
        ] } } },
      ],
    } : {}),
  };
  const orders = await db.order.findMany({
    where,
    include: { user: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const cell = "border-b border-slate-100 px-5 py-4 text-sm text-slate-600";

  return (
    <>
      <AdminPageHeader eyebrow="مدیریت فروش" title="سفارش‌ها" description="پرداخت‌ها، وضعیت آماده‌سازی و ارسال سفارش‌ها را یک‌جا پیگیری کنید." />

      <AdminPanel className="mb-5 p-4 sm:p-5">
        <form method="get" action="/admin/orders" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">
            جست‌وجوی سفارش
            <input name="q" defaultValue={query} className={adminFieldClass} placeholder="شماره سفارش، نام، ایمیل یا موبایل" />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">
            وضعیت سفارش
            <select name="status" defaultValue={status ?? ""} className={adminFieldClass}>
              <option value="">همه وضعیت‌ها</option>
              {statuses.map((item) => <option key={item} value={item}>{orderStatusLabels[item]}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="submit" className="min-h-12 flex-1 rounded-xl bg-[#172b4d] px-5 text-sm font-bold text-white transition hover:bg-[#203b66] sm:flex-none">اعمال فیلتر</button>
            {(query || status) && <Link href="/admin/orders" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-500 hover:bg-slate-50">پاک‌کردن</Link>}
          </div>
        </form>
      </AdminPanel>

      <AdminPanel>
        {!orders.length ? (
          <AdminEmptyState title="سفارشی پیدا نشد" description={query || status ? "فیلترها را تغییر دهید و دوباره جست‌وجو کنید." : "هنوز سفارشی در فروشگاه ثبت نشده است."} />
        ) : (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {orders.map((order: OrderRow) => {
                const customerName = `${order.user.firstName ?? ""} ${order.user.lastName ?? ""}`.trim() || "کاربر بدون نام";
                return (
                  <article key={order.id} className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><span className="block text-[11px] text-slate-400">شماره سفارش</span><strong className="block truncate text-sm text-[#17233b]" dir="ltr">{order.orderNumber}</strong></div>
                      <AdminStatusBadge tone={orderStatusTones[order.status]}>{orderStatusLabels[order.status]}</AdminStatusBadge>
                    </div>
                    <div><strong className="block text-sm text-slate-700">{customerName}</strong><span className="text-xs text-slate-400">{order.user.email}</span></div>
                    <dl className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                      <div><dt className="text-slate-400">مبلغ</dt><dd className="mt-1 font-bold text-slate-700">{formatMoney(order.total.toString())}</dd></div>
                      <div><dt className="text-slate-400">تعداد اقلام</dt><dd className="mt-1 font-bold text-slate-700">{order._count.items.toLocaleString("fa-IR")}</dd></div>
                      <div><dt className="text-slate-400">تاریخ</dt><dd className="mt-1 font-bold text-slate-700">{formatDate(order.createdAt)}</dd></div>
                    </dl>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[780px] border-collapse">
                <thead><tr>{["شماره سفارش", "مشتری", "اقلام", "مبلغ", "وضعیت", "تاریخ"].map((head) => <th className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 text-right text-xs font-bold text-slate-500" key={head}>{head}</th>)}</tr></thead>
                <tbody>{orders.map((order: OrderRow) => {
                  const customerName = `${order.user.firstName ?? ""} ${order.user.lastName ?? ""}`.trim() || "کاربر بدون نام";
                  return (
                    <tr key={order.id} className="transition hover:bg-slate-50/60">
                      <td className={cell}><strong className="text-[#17233b]" dir="ltr">{order.orderNumber}</strong></td>
                      <td className={cell}><strong className="block text-slate-700">{customerName}</strong><span className="text-xs text-slate-400">{order.user.email}</span></td>
                      <td className={cell}>{order._count.items.toLocaleString("fa-IR")}</td>
                      <td className={cell}><strong className="text-slate-700">{formatMoney(order.total.toString())}</strong></td>
                      <td className={cell}><AdminStatusBadge tone={orderStatusTones[order.status]}>{orderStatusLabels[order.status]}</AdminStatusBadge></td>
                      <td className={cell}>{formatDate(order.createdAt)}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </>
        )}
      </AdminPanel>
    </>
  );
}
