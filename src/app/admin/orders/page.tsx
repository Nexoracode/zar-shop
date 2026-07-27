import type { Prisma } from "@generated/prisma/client";
import { OrderStatus } from "@generated/prisma/enums";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminStatusBadge } from "@/components/admin-ui";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { orderStatusLabels, orderStatusTones } from "@/modules/admin/labels";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { parseAdminPagination, resolveAdminPagination } from "@/lib/admin-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableContent,
  TableHeader,
  TableRow,
  TableScrollContainer,
} from "@/components/hero";

type OrderRow = Prisma.OrderGetPayload<{ include: { user: true; _count: { select: { items: true } } } }>;
type SearchParams = Promise<{ q?: string; status?: string; page?: string; pageSize?: string }>;

const statuses = Object.values(OrderStatus);

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = statuses.includes(params.status as OrderStatus) ? params.status as OrderStatus : undefined;
  const { requestedPage, pageSize } = parseAdminPagination(params);
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
  const filteredTotal = await db.order.count({ where });
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const orders = await db.order.findMany({
    where,
    include: { user: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    skip: pagination.skip,
    take: pagination.pageSize,
  });
  const cell = "border-b border-slate-100 px-5 py-4 text-sm text-slate-600";

  return (
    <>
      <AdminPageHeader eyebrow="مدیریت فروش" title="سفارش‌ها" description="پرداخت‌ها، وضعیت آماده‌سازی و ارسال سفارش‌ها را یک‌جا پیگیری کنید." />

      <AdminPanel className="mb-5 p-4 sm:p-5">
        <AdminListFilters path="/admin/orders" query={query} queryLabel="جست‌وجوی سفارش" queryPlaceholder="شماره سفارش، نام، ایمیل یا موبایل" filters={[{ name: "status", label: "وضعیت سفارش", value: status ?? "", options: [{ value: "", label: "همه وضعیت‌ها" }, ...statuses.map((item) => ({ value: item, label: orderStatusLabels[item] }))] }]} />
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

            <Table className="hidden md:block"><TableScrollContainer><TableContent aria-label="فهرست سفارش‌ها" className="w-full min-w-[820px]"><TableHeader>{["ردیف", "شماره سفارش", "مشتری", "اقلام", "مبلغ", "وضعیت", "تاریخ"].map((head, index) => <TableColumn id={head} isRowHeader={index === 1} className="bg-slate-50/70 px-5 py-4 text-right text-xs font-bold text-slate-500" key={head}>{head}</TableColumn>)}</TableHeader><TableBody>{orders.map((order: OrderRow, index) => {
                  const customerName = `${order.user.firstName ?? ""} ${order.user.lastName ?? ""}`.trim() || "کاربر بدون نام";
                  return (
                    <TableRow id={order.id} key={order.id} className="transition hover:bg-slate-50/60">
                      <TableCell className={`${cell} w-16 font-bold text-slate-400`}>{(pagination.skip + index + 1).toLocaleString("fa-IR")}</TableCell>
                      <TableCell className={cell}><strong className="text-[#17233b]" dir="ltr">{order.orderNumber}</strong></TableCell>
                      <TableCell className={cell}><strong className="block text-slate-700">{customerName}</strong><span className="text-xs text-slate-400">{order.user.email}</span></TableCell>
                      <TableCell className={cell}>{order._count.items.toLocaleString("fa-IR")}</TableCell>
                      <TableCell className={cell}><strong className="text-slate-700">{formatMoney(order.total.toString())}</strong></TableCell>
                      <TableCell className={cell}><AdminStatusBadge tone={orderStatusTones[order.status]}>{orderStatusLabels[order.status]}</AdminStatusBadge></TableCell>
                      <TableCell className={cell}>{formatDate(order.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}</TableBody></TableContent></TableScrollContainer></Table>
            <AdminPagination {...pagination} />
          </>
        )}
      </AdminPanel>
    </>
  );
}
