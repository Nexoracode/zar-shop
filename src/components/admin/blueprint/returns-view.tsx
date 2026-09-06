import Link from "next/link";
import type { ReturnStatus } from "@generated/prisma/enums";
import { Eye } from "lucide-react";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { AdminPagination } from "@/components/admin-pagination";
import type { resolveAdminPagination } from "@/lib/admin-pagination";
import { formatDate, formatMoney } from "@/lib/format";
import { returnStatusLabels, returnStatusTones } from "@/modules/admin/labels";
import { BpTable, BpTag, BpTd, BpTh } from "./ui";

export type AdminReturnRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  orderTotal: string;
  customerName: string;
  contact: string;
  reason: string;
  itemCount: number;
  status: ReturnStatus;
  createdAt: string;
};

const bulkActions = [
  { value: "status:APPROVED", label: "تأیید مرجوعی‌های در انتظار" },
  { value: "status:REJECTED", label: "رد مرجوعی‌های در انتظار" },
];

export function serializeAdminReturnRow(row: {
  id: string;
  reason: string;
  status: ReturnStatus;
  createdAt: Date;
  order: { id: string; orderNumber: string; total: { toString(): string } };
  user: { firstName: string | null; lastName: string | null; phone: string | null };
  _count: { items: number };
}): AdminReturnRow {
  return {
    id: row.id,
    orderId: row.order.id,
    orderNumber: row.order.orderNumber,
    orderTotal: row.order.total.toString(),
    customerName: `${row.user.firstName ?? ""} ${row.user.lastName ?? ""}`.trim() || "کاربر بدون نام",
    contact: row.user.phone ?? "—",
    reason: row.reason,
    itemCount: row._count.items,
    status: row.status,
    createdAt: formatDate(row.createdAt),
  };
}

export function BlueprintReturnsView({ returns, pagination }: { returns: AdminReturnRow[]; pagination: ReturnType<typeof resolveAdminPagination> }) {
  return (
    <>
      <div className="md:hidden">
        {returns.map((row) => (
          <article key={row.id} className="flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="bp-muted block text-[11px]">شماره سفارش</span>
                <Link href={`/admin/orders/${row.orderId}`} dir="ltr" className="block truncate text-right text-sm font-bold text-[var(--bp-accent)] hover:underline">{row.orderNumber}</Link>
              </div>
              <BpTag tone={returnStatusTones[row.status]} withDot>{returnStatusLabels[row.status]}</BpTag>
            </div>
            <div className="min-w-0">
              <strong className="block truncate text-sm">{row.customerName}</strong>
              <span dir="ltr" className="bp-muted block truncate text-right text-xs">{row.contact}</span>
            </div>
            <p className="bp-muted m-0 line-clamp-2 text-[12px] leading-6">{row.reason}</p>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="bp-muted">{row.createdAt} · {row.itemCount.toLocaleString("fa-IR")} قلم</span>
              <strong className="text-[13px]">{formatMoney(row.orderTotal)}</strong>
            </div>
            <Link href={`/admin/returns/${row.id}`} className="bp-btn bp-btn-secondary bp-btn-sm w-full gap-2"><Eye size={15} />بررسی درخواست</Link>
          </article>
        ))}
      </div>

      <AdminBulkEditor entity="returns" entityLabel="مرجوعی" ids={returns.map((row) => row.id)} actions={bulkActions}>
        <BpTable ariaLabel="فهرست درخواست‌های مرجوعی" minWidth={960}>
          <thead>
            <tr>
              <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
              <BpTh className="w-12">ردیف</BpTh>
              <BpTh>شماره سفارش</BpTh>
              <BpTh>مشتری</BpTh>
              <BpTh>اقلام</BpTh>
              <BpTh>دلیل مرجوعی</BpTh>
              <BpTh>وضعیت</BpTh>
              <BpTh>تاریخ ثبت</BpTh>
              <BpTh className="text-center">جزئیات</BpTh>
            </tr>
          </thead>
          <tbody>
            {returns.map((row, index) => (
              <AdminBulkTr key={row.id} id={row.id}>
                <BpTd className="w-10 text-center"><AdminBulkCheckbox id={row.id} label={`انتخاب مرجوعی سفارش ${row.orderNumber}`} /></BpTd>
                <BpTd className="bp-muted w-12">{(pagination.skip + index + 1).toLocaleString("fa-IR")}</BpTd>
                <BpTd className="font-bold">
                  <Link href={`/admin/orders/${row.orderId}`} dir="ltr" className="text-[var(--bp-accent)] hover:underline">{row.orderNumber}</Link>
                </BpTd>
                <BpTd className="max-w-[200px]">
                  <span className="block truncate font-bold" title={row.customerName}>{row.customerName}</span>
                  <span dir="ltr" className="bp-muted block truncate text-right text-[11px]">{row.contact}</span>
                </BpTd>
                <BpTd className="text-[13px]">{row.itemCount.toLocaleString("fa-IR")}</BpTd>
                <BpTd className="max-w-[280px]"><span className="bp-muted block truncate text-[12px]" title={row.reason}>{row.reason}</span></BpTd>
                <BpTd><BpTag tone={returnStatusTones[row.status]} withDot>{returnStatusLabels[row.status]}</BpTag></BpTd>
                <BpTd className="bp-muted whitespace-nowrap">{row.createdAt}</BpTd>
                <BpTd>
                  <div className="flex items-center justify-center">
                    <Link href={`/admin/returns/${row.id}`} aria-label={`بررسی درخواست مرجوعی سفارش ${row.orderNumber}`} title="بررسی درخواست" className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><Eye size={15} strokeWidth={1.5} /></Link>
                  </div>
                </BpTd>
              </AdminBulkTr>
            ))}
          </tbody>
        </BpTable>
      </AdminBulkEditor>
      <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
    </>
  );
}
