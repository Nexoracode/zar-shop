import type { Prisma } from "@generated/prisma/client";
import { OrderStatus } from "@generated/prisma/enums";
import Link from "next/link";
import { Eye } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPanel } from "@/components/admin-ui";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { orderStatusLabels } from "@/modules/admin/labels";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { requirePermission } from "@/modules/auth/session";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { AdminOrderStatusSelect } from "@/components/admin-order-status-select";
import { getOrderSettings } from "@/modules/settings/order-settings";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableContent,
  TableHeader,
  TableRow,
  TableScrollContainer,
  TruncatedTextTooltip,
} from "@/components/hero";

type OrderRow = Prisma.OrderGetPayload<{ include: { user: true; _count: { select: { items: true } } } }>;
type SearchParams = Promise<{ q?: string; status?: string; product?: string; page?: string; pageSize?: string }>;

const statuses = Object.values(OrderStatus);

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("orders:manage");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = statuses.includes(params.status as OrderStatus) ? params.status as OrderStatus : undefined;
  const productId = params.product?.trim() || undefined;
  const filteredProduct = productId ? await db.product.findUnique({ where: { id: productId }, select: { id: true, name: true } }) : null;
  const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(filteredProduct ? { items: { some: { productId: filteredProduct.id } } } : {}),
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
  const [filteredTotal, orderSettings] = await Promise.all([db.order.count({ where }), getOrderSettings()]);
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

      {filteredProduct && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <span className="text-slate-500">فقط سفارش‌های شامل محصول:</span>
          <strong className="text-slate-800">{filteredProduct.name}</strong>
          <Link href="/admin/orders" className="mr-auto text-xs font-bold text-[var(--accent)] hover:underline">حذف فیلتر</Link>
        </div>
      )}

      <AdminPanel className="mb-5 p-4 sm:p-5">
        <AdminListFilters path="/admin/orders" query={query} queryLabel="جستجوی سفارش" queryPlaceholder="شماره سفارش، نام، ایمیل یا موبایل" filters={[{ name: "status", label: "وضعیت سفارش", value: status ?? "", options: [{ value: "", label: "همه وضعیت‌ها" }, ...statuses.map((item) => ({ value: item, label: orderStatusLabels[item] }))] }]} />
      </AdminPanel>

      <AdminPanel>
        {!orders.length ? (
          <AdminEmptyState title="سفارشی پیدا نشد" description={query || status ? "فیلترها را تغییر دهید و دوباره جستجو کنید." : "هنوز سفارشی در فروشگاه ثبت نشده است."} />
        ) : (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {orders.map((order: OrderRow) => {
                const customerName = `${order.user.firstName ?? ""} ${order.user.lastName ?? ""}`.trim() || "کاربر بدون نام";
                return (
                  <article key={order.id} className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><span className="block text-[11px] text-slate-400">شماره سفارش</span><strong className="block truncate text-sm text-[#17233b]" dir="ltr">{order.orderNumber}</strong></div>
                      <AdminOrderStatusSelect key={`${order.id}:${order.status}:${order.expiresAt?.toISOString() ?? "none"}`} orderId={order.id} initialStatus={order.status} expiresAt={order.expiresAt?.toISOString() ?? null} warningMinutes={orderSettings.orderWarningMinutes} />
                    </div>
                    <div><strong className="block text-sm text-slate-700">{customerName}</strong><span className="text-xs text-slate-400">{order.user.email ?? order.user.phone ?? "—"}</span></div>
                    <dl className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                      <div><dt className="text-slate-400">مبلغ</dt><dd className="mt-1 font-bold text-slate-700">{formatMoney(order.total.toString())}</dd></div>
                      <div><dt className="text-slate-400">تعداد اقلام</dt><dd className="mt-1 font-bold text-slate-700">{order._count.items.toLocaleString("fa-IR")}</dd></div>
                      <div><dt className="text-slate-400">تاریخ</dt><dd className="mt-1 font-bold text-slate-700">{formatDate(order.createdAt)}</dd></div>
                    </dl>
                    <Link href={`/admin/orders/${order.id}`} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[var(--accent)] transition hover:border-[var(--warning)] hover:text-[var(--warning)]"><Eye size={16} />مشاهده جزئیات</Link>
                  </article>
                );
              })}
            </div>

            <AdminBulkEditor entity="orders" entityLabel="سفارش" ids={orders.map((order) => order.id)} actions={[{ value: "status:PROCESSING", label: "شروع آماده‌سازی سفارش‌های پرداخت‌شده" }, { value: "status:SHIPPED", label: "ثبت ارسال سفارش‌های در حال آماده‌سازی" }, { value: "status:DELIVERED", label: "ثبت تحویل سفارش‌های ارسال‌شده" }, { value: "status:CANCELLED", label: "لغو سفارش‌های پرداخت‌نشده" }]}><Table><TableScrollContainer><TableContent aria-label="فهرست سفارش‌ها" className="w-full min-w-[940px]"><TableHeader><TableColumn id="select" className="w-12 bg-slate-50/70 px-4 py-4 text-center"><span className="sr-only">انتخاب</span></TableColumn>{["ردیف", "شماره سفارش", "مشتری", "اقلام", "مبلغ", "وضعیت", "تاریخ", "جزئیات"].map((head, index) => <TableColumn id={head} isRowHeader={index === 1} className="bg-slate-50/70 px-5 py-4 text-right text-xs font-bold text-slate-500" key={head}>{head}</TableColumn>)}</TableHeader><TableBody>{orders.map((order: OrderRow, index) => {
                  const customerName = `${order.user.firstName ?? ""} ${order.user.lastName ?? ""}`.trim() || "کاربر بدون نام";
                  return (
                    <TableRow id={order.id} key={order.id} className="transition hover:bg-slate-50/60">
                      <TableCell className={`${cell} w-12 text-center`}><AdminBulkCheckbox id={order.id} label={`انتخاب سفارش ${order.orderNumber}`} /></TableCell>
                      <TableCell className={`${cell} w-16 font-bold text-slate-400`}>{(pagination.skip + index + 1).toLocaleString("fa-IR")}</TableCell>
                      <TableCell className={cell}><strong className="text-[#17233b]" dir="ltr">{order.orderNumber}</strong></TableCell>
                      <TableCell className={`${cell} w-64 max-w-64`}><div className="min-w-0"><TruncatedTextTooltip text={customerName} className="max-w-52 font-bold text-slate-700" /><TruncatedTextTooltip text={order.user.email ?? order.user.phone ?? "—"} dir="ltr" className="max-w-52 text-right text-xs text-slate-400" /></div></TableCell>
                      <TableCell className={cell}>{order._count.items.toLocaleString("fa-IR")}</TableCell>
                      <TableCell className={cell}><strong className="text-slate-700">{formatMoney(order.total.toString())}</strong></TableCell>
                      <TableCell className={cell}><AdminOrderStatusSelect key={`${order.id}:${order.status}:${order.expiresAt?.toISOString() ?? "none"}`} orderId={order.id} initialStatus={order.status} expiresAt={order.expiresAt?.toISOString() ?? null} warningMinutes={orderSettings.orderWarningMinutes} /></TableCell>
                      <TableCell className={cell}>{formatDate(order.createdAt)}</TableCell>
                      <TableCell className={cell}><Link href={`/admin/orders/${order.id}`} aria-label={`مشاهده جزئیات سفارش ${order.orderNumber}`} title="مشاهده جزئیات" className="inline-flex h-9 min-h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-[var(--accent)] transition hover:border-[var(--warning)] hover:text-[var(--warning)]"><Eye size={15} /></Link></TableCell>
                    </TableRow>
                  );
                })}</TableBody></TableContent></TableScrollContainer></Table></AdminBulkEditor>
            <AdminPagination {...pagination} />
          </>
        )}
      </AdminPanel>
    </>
  );
}
