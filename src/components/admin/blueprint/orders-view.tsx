import Link from "next/link";
import type { OrderStatus } from "@generated/prisma/enums";
import { Eye, X } from "lucide-react";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { AdminOrderStatusSelect } from "@/components/admin-order-status-select";
import { formatDate, formatMoney } from "@/lib/format";
import { orderStatusLabels } from "@/modules/admin/labels";
import { BpTable, BpTd, BpTh } from "./ui";

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  contact: string;
  itemsCount: number;
  total: string;
  status: OrderStatus;
  expiresAt: string | null;
  createdAt: string;
};

export type AdminOrdersListData = {
  orders: AdminOrderRow[];
  query: string;
  status: string;
  statuses: OrderStatus[];
  filteredProduct: { id: string; name: string } | null;
  warningMinutes: number;
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number; skip: number };
};

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`bp-frame relative ${className}`.trim()}>{children}</section>;
}

const bulkActions = [
  { value: "status:PROCESSING", label: "شروع آماده‌سازی سفارش‌های پرداخت‌شده" },
  { value: "status:SHIPPED", label: "ثبت ارسال سفارش‌های در حال آماده‌سازی" },
  { value: "status:DELIVERED", label: "ثبت تحویل سفارش‌های ارسال‌شده" },
  { value: "status:CANCELLED", label: "لغو سفارش‌های پرداخت‌نشده" },
];

export function BlueprintOrdersView({ orders, query, status, statuses, filteredProduct, warningMinutes, pagination }: AdminOrdersListData) {
  const statusKey = (order: AdminOrderRow) => `${order.id}:${order.status}:${order.expiresAt ?? "none"}`;

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader
        flush
        title="سفارش‌ها"
        description="پرداخت‌ها، وضعیت آماده‌سازی و ارسال سفارش‌ها را یک‌جا پیگیری کنید."
      />

      {filteredProduct && (
        <p className="bp-frame m-0 flex flex-wrap items-center gap-2 p-3 text-[13px]">
          <span className="bp-muted">فقط سفارش‌های شامل محصول:</span>
          <strong>{filteredProduct.name}</strong>
          <Link href="/admin/orders" className="ms-auto inline-flex items-center gap-1 text-[12px] text-[var(--bp-accent)] hover:underline"><X size={13} />حذف فیلتر</Link>
        </p>
      )}

      <Panel className="p-4">
        <AdminListFilters
          path="/admin/orders"
          query={query}
          queryLabel="جستجوی سفارش"
          queryPlaceholder="شماره سفارش، نام، ایمیل یا موبایل"
          filters={[{ name: "status", label: "وضعیت سفارش", value: status, options: [{ value: "", label: "همه وضعیت‌ها" }, ...statuses.map((item) => ({ value: item, label: orderStatusLabels[item] }))] }]}
        />
      </Panel>

      <Panel>
        {!orders.length ? (
          <AdminEmptyState title="سفارشی پیدا نشد" description={query || status || filteredProduct ? "فیلترها را تغییر دهید و دوباره جستجو کنید." : "هنوز سفارشی در فروشگاه ثبت نشده است."} />
        ) : (
          <>
            <div className="md:hidden">
              {orders.map((order) => (
                <article key={order.id} className="flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="bp-muted block text-[11px]">شماره سفارش</span>
                      <strong dir="ltr" className="block truncate text-right text-sm">{order.orderNumber}</strong>
                    </div>
                    <AdminOrderStatusSelect key={statusKey(order)} orderId={order.id} initialStatus={order.status} expiresAt={order.expiresAt} warningMinutes={warningMinutes} />
                  </div>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm">{order.customerName}</strong>
                    <span dir="ltr" className="bp-muted block truncate text-right text-xs">{order.contact}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="bp-muted">{order.itemsCount.toLocaleString("fa-IR")} قلم · {order.createdAt}</span>
                    <strong className="text-[13px]">{formatMoney(order.total)}</strong>
                  </div>
                  <Link href={`/admin/orders/${order.id}`} className="bp-btn bp-btn-secondary bp-btn-sm w-full gap-2"><Eye size={15} />مشاهده جزئیات</Link>
                </article>
              ))}
            </div>

            <AdminBulkEditor entity="orders" entityLabel="سفارش" ids={orders.map((order) => order.id)} actions={bulkActions}>
              <BpTable ariaLabel="فهرست سفارش‌ها" minWidth={960}>
                <thead>
                  <tr>
                    <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                    <BpTh className="w-12">ردیف</BpTh>
                    <BpTh>شماره سفارش</BpTh>
                    <BpTh>مشتری</BpTh>
                    <BpTh>اقلام</BpTh>
                    <BpTh>مبلغ</BpTh>
                    <BpTh>وضعیت</BpTh>
                    <BpTh>تاریخ</BpTh>
                    <BpTh className="text-center">جزئیات</BpTh>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => (
                    <AdminBulkTr key={order.id} id={order.id}>
                      <BpTd className="w-10 text-center"><AdminBulkCheckbox id={order.id} label={`انتخاب سفارش ${order.orderNumber}`} /></BpTd>
                      <BpTd className="bp-muted w-12">{(pagination.skip + index + 1).toLocaleString("fa-IR")}</BpTd>
                      <BpTd className="font-bold"><span dir="ltr">{order.orderNumber}</span></BpTd>
                      <BpTd className="max-w-[220px]">
                        <span className="block truncate font-bold" title={order.customerName}>{order.customerName}</span>
                        <span dir="ltr" className="bp-muted block truncate text-right text-[11px]">{order.contact}</span>
                      </BpTd>
                      <BpTd className="text-[var(--bp-text)]">{order.itemsCount.toLocaleString("fa-IR")}</BpTd>
                      <BpTd className="font-bold text-[var(--bp-text)]">{formatMoney(order.total)}</BpTd>
                      <BpTd><AdminOrderStatusSelect key={statusKey(order)} orderId={order.id} initialStatus={order.status} expiresAt={order.expiresAt} warningMinutes={warningMinutes} /></BpTd>
                      <BpTd className="bp-muted whitespace-nowrap">{order.createdAt}</BpTd>
                      <BpTd>
                        <div className="flex items-center justify-center">
                          <Link href={`/admin/orders/${order.id}`} aria-label={`مشاهده جزئیات سفارش ${order.orderNumber}`} title="مشاهده جزئیات" className="bp-btn bp-btn-secondary bp-btn-icon bp-btn-sm"><Eye size={15} /></Link>
                        </div>
                      </BpTd>
                    </AdminBulkTr>
                  ))}
                </tbody>
              </BpTable>
            </AdminBulkEditor>
            <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
          </>
        )}
      </Panel>
    </div>
  );
}

export function serializeAdminOrderRow(order: {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: { toString(): string };
  expiresAt: Date | null;
  createdAt: Date;
  user: { firstName: string | null; lastName: string | null; email: string | null; phone: string | null };
  _count: { items: number };
}): AdminOrderRow {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: `${order.user.firstName ?? ""} ${order.user.lastName ?? ""}`.trim() || "کاربر بدون نام",
    contact: order.user.email ?? order.user.phone ?? "—",
    itemsCount: order._count.items,
    total: order.total.toString(),
    status: order.status,
    expiresAt: order.expiresAt?.toISOString() ?? null,
    createdAt: formatDate(order.createdAt),
  };
}
