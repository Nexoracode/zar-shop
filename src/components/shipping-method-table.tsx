"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { AdminStatusBadge } from "@/components/admin-ui";
import { Table, TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRow, TableScrollContainer } from "@/components/hero";
import { AdminTableRefreshButton } from "@/components/admin-table-refresh";
import { ShippingMethodDeleteButton } from "@/components/shipping-method-delete-button";

export type ShippingMethodRow = {
  id: string;
  title: string;
  carrier: string;
  source: string;
  estimatedDays: number;
  isActive: boolean;
  zoneCount: number;
  orderCount: number;
};

/** A live rate still needs table rows behind it, so the column reports both together. */
function sourceLabel(method: ShippingMethodRow) {
  if (method.source !== "TAPIN") return "جدول نرخ فروشگاه";
  return method.zoneCount ? "نرخ لحظه‌ای، با نرخ پشتیبان" : "نرخ لحظه‌ای، بدون پشتیبان";
}

export function ShippingMethodTable({ methods }: { methods: ShippingMethodRow[] }) {
  const cellClass = "border-t border-slate-100 px-4 py-3 text-xs";

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">{methods.length.toLocaleString("fa-IR")} روش ارسال</span>
        <AdminTableRefreshButton />
      </div>

      <div className="divide-y divide-slate-100 md:hidden">
        {methods.map((method) => (
          <article key={method.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <strong className="block truncate text-sm text-slate-700">{method.title}</strong>
                <span className="mt-1 block truncate text-xs text-slate-400">{method.carrier} · {sourceLabel(method)}</span>
              </div>
              <AdminStatusBadge tone={method.isActive ? "success" : "neutral"}>{method.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-slate-400">{method.estimatedDays.toLocaleString("fa-IR")} روز کاری</span>
              <div className="mr-auto flex gap-1">
                <Link href={`/admin/shipping-methods/${method.id}/edit`} aria-label={`ویرایش ${method.title}`} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><Pencil size={15} /></Link>
                <ShippingMethodDeleteButton id={method.id} title={method.title} orderCount={method.orderCount} iconOnly />
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden md:block">
        <Table><TableScrollContainer><TableContent aria-label="فهرست روش‌های ارسال" className="w-full min-w-[720px]">
          <TableHeader>
            <TableColumn id="title" className="bg-slate-50/70 px-4 py-4 text-right text-xs font-bold text-slate-500">روش ارسال</TableColumn>
            <TableColumn id="carrier" className="bg-slate-50/70 px-4 py-4 text-right text-xs font-bold text-slate-500">شرکت حمل</TableColumn>
            <TableColumn id="source" className="bg-slate-50/70 px-4 py-4 text-right text-xs font-bold text-slate-500">منبع نرخ</TableColumn>
            <TableColumn id="days" className="bg-slate-50/70 px-4 py-4 text-right text-xs font-bold text-slate-500">زمان تحویل</TableColumn>
            <TableColumn id="status" className="bg-slate-50/70 px-4 py-4 text-right text-xs font-bold text-slate-500">وضعیت</TableColumn>
            <TableColumn id="action" className="w-[12%] bg-slate-50/70 px-4 py-4 text-center text-xs font-bold text-slate-500">عملیات</TableColumn>
          </TableHeader>
          <TableBody>
            {methods.map((method) => (
              <TableRow key={method.id} id={method.id} className="transition hover:bg-slate-50/70">
                <TableCell className={`${cellClass} font-bold text-slate-700`}>{method.title}</TableCell>
                <TableCell className={cellClass}>{method.carrier}</TableCell>
                <TableCell className={`${cellClass} text-slate-500`}>{sourceLabel(method)}</TableCell>
                <TableCell className={cellClass}>{method.estimatedDays.toLocaleString("fa-IR")} روز کاری</TableCell>
                <TableCell className={cellClass}><AdminStatusBadge tone={method.isActive ? "success" : "neutral"}>{method.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></TableCell>
                <TableCell className={`${cellClass} text-center`}>
                  <div className="flex justify-center gap-1">
                    <Link href={`/admin/shipping-methods/${method.id}/edit`} aria-label={`ویرایش ${method.title}`} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><Pencil size={15} /></Link>
                    <ShippingMethodDeleteButton id={method.id} title={method.title} orderCount={method.orderCount} iconOnly />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableContent></TableScrollContainer></Table>
      </div>
    </>
  );
}
