"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { AdminEmptyState, AdminPanel, AdminStatusBadge } from "@/components/admin-ui";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { normalizeSearchText } from "@/lib/text-search";
import { BpListFilters, BpTable, BpTd, BpTh } from "./ui";
import { ShippingMethodDeleteButton } from "./shipping-method-delete-button";

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

export function BlueprintShippingMethodsView({ methods }: { methods: ShippingMethodRow[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const normalizedQuery = normalizeSearchText(query);
  const visible = methods.filter((method) => {
    if (normalizedQuery && !normalizeSearchText(`${method.title} ${method.carrier}`).includes(normalizedQuery)) return false;
    if (statusFilter === "active" && !method.isActive) return false;
    if (statusFilter === "inactive" && method.isActive) return false;
    if (sourceFilter && method.source !== sourceFilter) return false;
    return true;
  });

  return (
    <AdminPanel>
      {methods.length ? (
        <>
          <BpListFilters
            query={query}
            onQueryChange={setQuery}
            searchLabel="جستجوی روش ارسال"
            searchPlaceholder="جستجو بر اساس نام روش یا شرکت حمل"
            filters={[
              { name: "status", ariaLabel: "وضعیت روش ارسال", value: statusFilter, onChange: setStatusFilter, options: [{ value: "", label: "همه وضعیت‌ها" }, { value: "active", label: "فعال" }, { value: "inactive", label: "غیرفعال" }] },
              { name: "source", ariaLabel: "منبع نرخ", value: sourceFilter, onChange: setSourceFilter, options: [{ value: "", label: "همه منابع نرخ" }, { value: "TABLE", label: "جدول نرخ فروشگاه" }, { value: "TAPIN", label: "نرخ لحظه‌ای تاپین" }] },
            ]}
          />

          {visible.length ? (
            <>
              <div className="md:hidden">
                {visible.map((method) => (
                  <article key={method.id} className="flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block truncate text-[13px]">{method.title}</strong>
                        <span className="bp-muted mt-0.5 block truncate text-[11px]">{method.carrier} · {sourceLabel(method)}</span>
                      </div>
                      <AdminStatusBadge tone={method.isActive ? "success" : "neutral"}>{method.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="bp-muted text-[11px]">{method.estimatedDays.toLocaleString("fa-IR")} روز کاری</span>
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/shipping-methods/${method.id}/edit`} aria-label={`ویرایش ${method.title}`} className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><Pencil size={14} /></Link>
                        <ShippingMethodDeleteButton id={method.id} title={method.title} orderCount={method.orderCount} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <AdminBulkEditor entity="shippingMethods" entityLabel="روش ارسال" ids={visible.map((method) => method.id)} actions={[{ value: "active:on", label: "فعال‌کردن روش‌ها" }, { value: "active:off", label: "غیرفعال‌کردن روش‌ها" }]}>
                <BpTable ariaLabel="فهرست روش‌های ارسال" minWidth={760}>
                  <thead>
                    <tr>
                      <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                      <BpTh>روش ارسال</BpTh>
                      <BpTh>شرکت حمل</BpTh>
                      <BpTh>منبع نرخ</BpTh>
                      <BpTh>زمان تحویل</BpTh>
                      <BpTh>وضعیت</BpTh>
                      <BpTh className="text-center">عملیات</BpTh>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((method) => (
                      <AdminBulkTr key={method.id} id={method.id}>
                        <BpTd className="w-10 text-center"><AdminBulkCheckbox id={method.id} label={`انتخاب ${method.title}`} /></BpTd>
                        <BpTd className="max-w-[220px] truncate font-bold" title={method.title}>{method.title}</BpTd>
                        <BpTd>{method.carrier}</BpTd>
                        <BpTd className="bp-muted">{sourceLabel(method)}</BpTd>
                        <BpTd>{method.estimatedDays.toLocaleString("fa-IR")} روز کاری</BpTd>
                        <BpTd><AdminStatusBadge tone={method.isActive ? "success" : "neutral"}>{method.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></BpTd>
                        <BpTd>
                          <div className="flex items-center justify-center gap-1">
                            <Link href={`/admin/shipping-methods/${method.id}/edit`} title="ویرایش روش ارسال" aria-label={`ویرایش ${method.title}`} className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><Pencil size={14} /></Link>
                            <ShippingMethodDeleteButton id={method.id} title={method.title} orderCount={method.orderCount} />
                          </div>
                        </BpTd>
                      </AdminBulkTr>
                    ))}
                  </tbody>
                </BpTable>
              </AdminBulkEditor>
            </>
          ) : <div className="p-6"><AdminEmptyState title="روشی پیدا نشد" description="هیچ روش ارسالی با جستجو و فیلترهای انتخابی مطابقت ندارد." /></div>}
        </>
      ) : <AdminEmptyState title="روش ارسالی ثبت نشده" description="تا وقتی هیچ روشی تعریف نشده باشد، تسویه حساب همان هزینه ثابت تنظیمات را اعمال می‌کند." />}
    </AdminPanel>
  );
}
