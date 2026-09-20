"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import type { OrderStatus } from "@generated/prisma/enums";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { AdminColumn, AdminColumnSettingsButton, AdminColumnVisibility } from "@/components/admin-column-visibility";
import { AdminColumnFilter } from "@/components/admin-column-filter";
import { AdminGenericBulkEditButton } from "@/components/admin-generic-bulk-edit";
import { AdminOrderStatusSelect } from "@/components/admin-order-status-select";
import { formatMoney } from "@/lib/format";
import { orderStatusLabels } from "@/modules/admin/labels";
import { BpTable, BpTag, BpTd, BpTh } from "./ui";
import type { AdminOrderRow } from "./orders-view";

const TABLE_ID = "orders";

const COLUMNS = [
  { id: "orderNumber", label: "شماره سفارش" },
  { id: "customer", label: "مشتری" },
  { id: "items", label: "اقلام" },
  { id: "total", label: "مبلغ" },
  { id: "status", label: "وضعیت" },
  { id: "createdAt", label: "تاریخ" },
];

export function OrdersTable({ orders, pagination, warningMinutes, initialHiddenColumns, status, statuses }: {
  orders: AdminOrderRow[];
  pagination: { skip: number };
  warningMinutes: number;
  initialHiddenColumns: string[];
  status: string;
  statuses: OrderStatus[];
}) {
  const statusKey = (order: AdminOrderRow) => `${order.id}:${order.status}:${order.expiresAt ?? "none"}`;

  return (
    <AdminColumnVisibility tableId={TABLE_ID} columns={COLUMNS} initialHidden={initialHiddenColumns}>
      <AdminBulkEditor
        entity="orders"
        entityLabel="سفارش"
        ids={orders.map((order) => order.id)}
        actions={[]}
        beforeSelectAll={<AdminColumnSettingsButton />}
        extraAction={<AdminGenericBulkEditButton entity="orders" entityLabel="سفارش" changeTypes={[{ value: "status", label: "تغییر وضعیت", options: [
          { value: "status:PROCESSING", label: "شروع آماده‌سازی سفارش‌های پرداخت‌شده" },
          { value: "status:SHIPPED", label: "ثبت ارسال سفارش‌های در حال آماده‌سازی" },
          { value: "status:DELIVERED", label: "ثبت تحویل سفارش‌های ارسال‌شده" },
          { value: "status:CANCELLED", label: "لغو سفارش‌های پرداخت‌نشده" },
        ] }]} />}
      >
        <BpTable ariaLabel="فهرست سفارش‌ها" minWidth={960}>
          <thead>
            <tr>
              <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
              <BpTh className="w-12">ردیف</BpTh>
              <AdminColumn id="orderNumber"><BpTh>شماره سفارش</BpTh></AdminColumn>
              <AdminColumn id="customer"><BpTh>مشتری</BpTh></AdminColumn>
              <AdminColumn id="items"><BpTh>اقلام</BpTh></AdminColumn>
              <AdminColumn id="total"><BpTh>مبلغ</BpTh></AdminColumn>
              <AdminColumn id="status"><BpTh><span className="inline-flex items-center">وضعیت<AdminColumnFilter path="/admin/orders" ariaLabel="فیلتر وضعیت" groups={[{ name: "status", label: "وضعیت سفارش", value: status, options: [{ value: "", label: "همه وضعیت‌ها" }, ...statuses.map((item) => ({ value: item, label: orderStatusLabels[item] }))] }]} /></span></BpTh></AdminColumn>
              <AdminColumn id="createdAt"><BpTh>تاریخ</BpTh></AdminColumn>
              <BpTh>جزئیات</BpTh>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <AdminBulkTr key={order.id} id={order.id}>
                <BpTd className="w-10 text-center"><AdminBulkCheckbox id={order.id} label={`انتخاب سفارش ${order.orderNumber}`} /></BpTd>
                <BpTd className="bp-muted w-12">{(pagination.skip + index + 1).toLocaleString("fa-IR")}</BpTd>
                <AdminColumn id="orderNumber"><BpTd className="font-bold"><span dir="ltr">{order.orderNumber}</span></BpTd></AdminColumn>
                <AdminColumn id="customer">
                  <BpTd className="max-w-[220px]">
                    <span className="block truncate font-bold" title={order.customerName}>{order.customerName}</span>
                    <span dir="ltr" className="bp-muted block truncate text-right text-[11px]">{order.contact}</span>
                  </BpTd>
                </AdminColumn>
                <AdminColumn id="items"><BpTd className="text-[var(--bp-text)]">{order.itemsCount.toLocaleString("fa-IR")}</BpTd></AdminColumn>
                <AdminColumn id="total"><BpTd className="font-bold text-[var(--bp-text)]">{formatMoney(order.total)}</BpTd></AdminColumn>
                <AdminColumn id="status"><BpTd><AdminOrderStatusSelect key={statusKey(order)} orderId={order.id} initialStatus={order.status} expiresAt={order.awaitingTransferReview ? null : order.expiresAt} warningMinutes={warningMinutes} />{order.awaitingTransferReview && <BpTag tone="warning" withDot className="mt-1.5">کارت‌به‌کارت در انتظار تأیید</BpTag>}</BpTd></AdminColumn>
                <AdminColumn id="createdAt"><BpTd className="bp-muted whitespace-nowrap">{order.createdAt}</BpTd></AdminColumn>
                <BpTd>
                  <div className="flex items-center justify-start">
                    <Link href={`/admin/orders/${order.id}`} aria-label={`مشاهده جزئیات سفارش ${order.orderNumber}`} title="مشاهده جزئیات" className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><Eye size={15} strokeWidth={1.5} /></Link>
                  </div>
                </BpTd>
              </AdminBulkTr>
            ))}
          </tbody>
        </BpTable>
      </AdminBulkEditor>
    </AdminColumnVisibility>
  );
}
