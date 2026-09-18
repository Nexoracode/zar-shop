"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Eye, Settings2 } from "lucide-react";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { AdminOrderStatusSelect } from "@/components/admin-order-status-select";
import { formatMoney } from "@/lib/format";
import { getHiddenColumns, setHiddenColumns, subscribeToHiddenColumns } from "@/lib/admin-column-visibility";
import { BpButton, BpCheckbox, BpPopover, BpTable, BpTd, BpTh } from "./ui";
import type { AdminOrderRow } from "./orders-view";

const TABLE_ID = "orders";

const COLUMNS = [
  { id: "orderNumber", label: "شماره سفارش" },
  { id: "customer", label: "مشتری" },
  { id: "items", label: "اقلام" },
  { id: "total", label: "مبلغ" },
  { id: "status", label: "وضعیت" },
  { id: "createdAt", label: "تاریخ" },
] as const;

type ColumnId = (typeof COLUMNS)[number]["id"];

const bulkActions = [
  { value: "status:PROCESSING", label: "شروع آماده‌سازی سفارش‌های پرداخت‌شده" },
  { value: "status:SHIPPED", label: "ثبت ارسال سفارش‌های در حال آماده‌سازی" },
  { value: "status:DELIVERED", label: "ثبت تحویل سفارش‌های ارسال‌شده" },
  { value: "status:CANCELLED", label: "لغو سفارش‌های پرداخت‌نشده" },
];

function ColumnSettings({ hidden, onToggle }: { hidden: Set<string>; onToggle: (id: ColumnId) => void }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <BpButton
        ref={triggerRef}
        isIconOnly
        variant="ghost"
        size="sm"
        title="تنظیم ستون‌های جدول"
        aria-label="تنظیم ستون‌های جدول"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Settings2 size={15} strokeWidth={1.5} />
      </BpButton>
      <BpPopover open={open} anchorRef={triggerRef} onClose={() => setOpen(false)} label="تنظیم ستون‌های جدول" width={210}>
        <p className="bp-muted m-0 mb-2 text-[12px]">نمایش ستون‌ها</p>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {COLUMNS.map((column) => (
            <li key={column.id}>
              <BpCheckbox isSelected={!hidden.has(column.id)} onChange={() => onToggle(column.id)}>{column.label}</BpCheckbox>
            </li>
          ))}
        </ul>
      </BpPopover>
    </>
  );
}

export function OrdersTable({ orders, pagination, warningMinutes, initialHiddenColumns }: {
  orders: AdminOrderRow[];
  pagination: { skip: number };
  warningMinutes: number;
  /** Read from the cookie on the server, so the first paint already has the right columns. */
  initialHiddenColumns: string[];
}) {
  const serverSnapshot = useCallback(() => initialHiddenColumns, [initialHiddenColumns]);
  const subscribe = useCallback((callback: () => void) => subscribeToHiddenColumns(TABLE_ID, callback), []);
  const getSnapshot = useCallback(() => getHiddenColumns(TABLE_ID), []);
  const hiddenList = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const hidden = useMemo(() => new Set(hiddenList), [hiddenList]);

  function toggleColumn(id: ColumnId) {
    const next = hidden.has(id) ? hiddenList.filter((item) => item !== id) : [...hiddenList, id];
    setHiddenColumns(TABLE_ID, next);
  }

  const statusKey = (order: AdminOrderRow) => `${order.id}:${order.status}:${order.expiresAt ?? "none"}`;

  return (
    <AdminBulkEditor
      entity="orders"
      entityLabel="سفارش"
      ids={orders.map((order) => order.id)}
      actions={bulkActions}
      beforeSelectAll={<ColumnSettings hidden={hidden} onToggle={toggleColumn} />}
    >
      <BpTable ariaLabel="فهرست سفارش‌ها" minWidth={960}>
        <thead>
          <tr>
            <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
            <BpTh className="w-12">ردیف</BpTh>
            {!hidden.has("orderNumber") && <BpTh>شماره سفارش</BpTh>}
            {!hidden.has("customer") && <BpTh>مشتری</BpTh>}
            {!hidden.has("items") && <BpTh>اقلام</BpTh>}
            {!hidden.has("total") && <BpTh>مبلغ</BpTh>}
            {!hidden.has("status") && <BpTh>وضعیت</BpTh>}
            {!hidden.has("createdAt") && <BpTh>تاریخ</BpTh>}
            <BpTh className="text-center">جزئیات</BpTh>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => (
            <AdminBulkTr key={order.id} id={order.id}>
              <BpTd className="w-10 text-center"><AdminBulkCheckbox id={order.id} label={`انتخاب سفارش ${order.orderNumber}`} /></BpTd>
              <BpTd className="bp-muted w-12">{(pagination.skip + index + 1).toLocaleString("fa-IR")}</BpTd>
              {!hidden.has("orderNumber") && <BpTd className="font-bold"><span dir="ltr">{order.orderNumber}</span></BpTd>}
              {!hidden.has("customer") && (
                <BpTd className="max-w-[220px]">
                  <span className="block truncate font-bold" title={order.customerName}>{order.customerName}</span>
                  <span dir="ltr" className="bp-muted block truncate text-right text-[11px]">{order.contact}</span>
                </BpTd>
              )}
              {!hidden.has("items") && <BpTd className="text-[var(--bp-text)]">{order.itemsCount.toLocaleString("fa-IR")}</BpTd>}
              {!hidden.has("total") && <BpTd className="font-bold text-[var(--bp-text)]">{formatMoney(order.total)}</BpTd>}
              {!hidden.has("status") && <BpTd><AdminOrderStatusSelect key={statusKey(order)} orderId={order.id} initialStatus={order.status} expiresAt={order.expiresAt} warningMinutes={warningMinutes} /></BpTd>}
              {!hidden.has("createdAt") && <BpTd className="bp-muted whitespace-nowrap">{order.createdAt}</BpTd>}
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
  );
}
