"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { AdminColumn, AdminColumnSettingsButton, AdminColumnVisibility } from "@/components/admin-column-visibility";
import { AdminOrderStatusSelect } from "@/components/admin-order-status-select";
import { formatMoney } from "@/lib/format";
import { BpTable, BpTd, BpTh } from "./ui";
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

const bulkActions = [
  { value: "status:PROCESSING", label: "شروع آماده‌سازی سفارش‌های پرداخت‌شده" },
  { value: "status:SHIPPED", label: "ثبت ارسال سفارش‌های در حال آماده‌سازی" },
  { value: "status:DELIVERED", label: "ثبت تحویل سفارش‌های ارسال‌شده" },
  { value: "status:CANCELLED", label: "لغو سفارش‌های پرداخت‌نشده" },
];

export function OrdersTable({ orders, pagination, warningMinutes, initialHiddenColumns }: {
  orders: AdminOrderRow[];
  pagination: { skip: number };
  warningMinutes: number;
  initialHiddenColumns: string[];
}) {
  const statusKey = (order: AdminOrderRow) => `${order.id}:${order.status}:${order.expiresAt ?? "none"}`;

  return (
    <AdminColumnVisibility tableId={TABLE_ID} columns={COLUMNS} initialHidden={initialHiddenColumns}>
      <AdminBulkEditor
        entity="orders"
        entityLabel="سفارش"
        ids={orders.map((order) => order.id)}
        actions={bulkActions}
        beforeSelectAll={<AdminColumnSettingsButton />}
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
              <AdminColumn id="status"><BpTh>وضعیت</BpTh></AdminColumn>
              <AdminColumn id="createdAt"><BpTh>تاریخ</BpTh></AdminColumn>
              <BpTh className="text-center">جزئیات</BpTh>
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
                <AdminColumn id="status"><BpTd><AdminOrderStatusSelect key={statusKey(order)} orderId={order.id} initialStatus={order.status} expiresAt={order.expiresAt} warningMinutes={warningMinutes} /></BpTd></AdminColumn>
                <AdminColumn id="createdAt"><BpTd className="bp-muted whitespace-nowrap">{order.createdAt}</BpTd></AdminColumn>
                <BpTd>
                  <div className="flex items-center justify-center">
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
