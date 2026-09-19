"use client";

import Link from "next/link";
import { useState } from "react";
import { SquarePen } from "lucide-react";
import { AdminEmptyState, AdminPanel, AdminStatusBadge } from "@/components/admin-ui";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { AdminColumn, AdminColumnSettingsButton, AdminColumnVisibility } from "@/components/admin-column-visibility";
import { AdminColumnFilter } from "@/components/admin-column-filter";
import { AdminActiveToggle } from "@/components/admin-active-toggle";
import { AdminGenericBulkEditButton } from "@/components/admin-generic-bulk-edit";
import { normalizeSearchText } from "@/lib/text-search";
import { BpListFilters, BpTable, BpTag, BpTd, BpTh } from "./ui";
import { PackagingBoxDeleteButton } from "./packaging-box-delete-button";

export type PackagingBoxRow = {
  id: string;
  name: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightGrams: number;
  maxWeightGrams: number;
  tapinBoxId: number | null;
  isDefault: boolean;
  isActive: boolean;
};

function grams(value: number) {
  return `${value.toLocaleString("fa-IR")} گرم`;
}

function dimensions(box: PackagingBoxRow) {
  return `${box.lengthCm.toLocaleString("fa-IR")} × ${box.widthCm.toLocaleString("fa-IR")} × ${box.heightCm.toLocaleString("fa-IR")} سانتی‌متر`;
}

const PACKAGING_TABLE_ID = "packagingBoxes";

const packagingColumns = [
  { id: "name", label: "نام جعبه" },
  { id: "dimensions", label: "ابعاد" },
  { id: "weight", label: "وزن جعبه" },
  { id: "maxWeight", label: "حداکثر وزن محتوا" },
  { id: "tapinId", label: "شناسه تاپین" },
  { id: "status", label: "وضعیت" },
  { id: "isDefault", label: "پیش‌فرض" },
];

export function BlueprintPackagingView({ boxes, initialHiddenColumns }: { boxes: PackagingBoxRow[]; initialHiddenColumns: string[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [defaultFilter, setDefaultFilter] = useState("");

  const normalizedQuery = normalizeSearchText(query);
  const visible = boxes.filter((box) => {
    if (normalizedQuery && !normalizeSearchText(box.name).includes(normalizedQuery)) return false;
    if (statusFilter === "active" && !box.isActive) return false;
    if (statusFilter === "inactive" && box.isActive) return false;
    if (defaultFilter === "yes" && !box.isDefault) return false;
    if (defaultFilter === "no" && box.isDefault) return false;
    return true;
  });

  return (
    <AdminPanel>
      {boxes.length ? (
        <>
          <BpListFilters
            query={query}
            onQueryChange={setQuery}
            searchLabel="جستجوی جعبه"
            searchPlaceholder="جستجو بر اساس نام جعبه"
          />

          {visible.length ? (
            <>
              <div className="md:hidden">
                {visible.map((box) => (
                  <article key={box.id} className="flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-[13px]">{box.name}</strong>
                        <span className="bp-muted mt-0.5 block truncate text-[11px]">{dimensions(box)}</span>
                      </div>
                      <AdminStatusBadge tone={box.isActive ? "success" : "neutral"}>{box.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge>
                    </div>
                    <div className="bp-muted flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                      <span>وزن جعبه: {grams(box.weightGrams)}</span>
                      <span>حداکثر محتوا: {grams(box.maxWeightGrams)}</span>
                      <span dir="ltr">تاپین: {box.tapinBoxId ?? "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      {box.isDefault ? <BpTag tone="info">پیش‌فرض</BpTag> : <span />}
                      <div className="flex items-center gap-1">
                        <AdminActiveToggle entity="packagingBoxes" entityLabel="جعبه" id={box.id} name={box.name} isActive={box.isActive} disabled={box.isDefault} disabledTitle="جعبه پیش‌فرض باید فعال بماند" />
                        <Link href={`/admin/packaging/${box.id}/edit`} aria-label={`ویرایش ${box.name}`} className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><SquarePen size={15} strokeWidth={1.5} /></Link>
                        {!box.isDefault && <PackagingBoxDeleteButton id={box.id} name={box.name} />}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <AdminColumnVisibility tableId={PACKAGING_TABLE_ID} columns={packagingColumns} initialHidden={initialHiddenColumns}>
                <AdminBulkEditor
                  entity="packagingBoxes"
                  entityLabel="جعبه"
                  ids={visible.map((box) => box.id)}
                  actions={[]}
                  beforeSelectAll={<AdminColumnSettingsButton />}
                  extraAction={<AdminGenericBulkEditButton entity="packagingBoxes" entityLabel="جعبه" changeTypes={[{ value: "active", label: "وضعیت", options: [{ value: "active:on", label: "فعال‌کردن" }, { value: "active:off", label: "غیرفعال‌کردن" }] }]} />}
                >
                  <BpTable ariaLabel="فهرست جعبه‌های بسته‌بندی" minWidth={880}>
                    <thead>
                      <tr>
                        <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                        <AdminColumn id="name"><BpTh>نام جعبه</BpTh></AdminColumn>
                        <AdminColumn id="dimensions"><BpTh>ابعاد</BpTh></AdminColumn>
                        <AdminColumn id="weight"><BpTh>وزن جعبه</BpTh></AdminColumn>
                        <AdminColumn id="maxWeight"><BpTh>حداکثر وزن محتوا</BpTh></AdminColumn>
                        <AdminColumn id="tapinId"><BpTh>شناسه تاپین</BpTh></AdminColumn>
                        <AdminColumn id="status"><BpTh><span className="inline-flex items-center">وضعیت<AdminColumnFilter ariaLabel="فیلتر وضعیت" groups={[{ name: "status", label: "وضعیت", value: statusFilter, onChange: setStatusFilter, options: [{ value: "", label: "همه وضعیت‌ها" }, { value: "active", label: "فعال" }, { value: "inactive", label: "غیرفعال" }] }]} /></span></BpTh></AdminColumn>
                        <AdminColumn id="isDefault"><BpTh><span className="inline-flex items-center">پیش‌فرض<AdminColumnFilter ariaLabel="فیلتر پیش‌فرض" groups={[{ name: "default", label: "جعبه پیش‌فرض", value: defaultFilter, onChange: setDefaultFilter, options: [{ value: "", label: "همه" }, { value: "yes", label: "جعبه پیش‌فرض" }, { value: "no", label: "غیر پیش‌فرض" }] }]} /></span></BpTh></AdminColumn>
                        <BpTh className="text-center">عملیات</BpTh>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((box) => (
                        <AdminBulkTr key={box.id} id={box.id}>
                          <BpTd className="w-10 text-center"><AdminBulkCheckbox id={box.id} label={`انتخاب جعبه ${box.name}`} /></BpTd>
                          <AdminColumn id="name"><BpTd className="max-w-[200px] truncate font-bold" title={box.name}>{box.name}</BpTd></AdminColumn>
                          <AdminColumn id="dimensions"><BpTd className="bp-muted">{dimensions(box)}</BpTd></AdminColumn>
                          <AdminColumn id="weight"><BpTd>{grams(box.weightGrams)}</BpTd></AdminColumn>
                          <AdminColumn id="maxWeight"><BpTd>{grams(box.maxWeightGrams)}</BpTd></AdminColumn>
                          <AdminColumn id="tapinId"><BpTd>{box.tapinBoxId != null ? <span dir="ltr">{box.tapinBoxId}</span> : <span className="bp-muted">—</span>}</BpTd></AdminColumn>
                          <AdminColumn id="status"><BpTd><AdminStatusBadge tone={box.isActive ? "success" : "neutral"}>{box.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></BpTd></AdminColumn>
                          <AdminColumn id="isDefault"><BpTd>{box.isDefault ? <BpTag tone="info">پیش‌فرض</BpTag> : <span className="bp-muted">—</span>}</BpTd></AdminColumn>
                          <BpTd>
                            <div className="flex items-center justify-center gap-1">
                              <AdminActiveToggle entity="packagingBoxes" entityLabel="جعبه" id={box.id} name={box.name} isActive={box.isActive} disabled={box.isDefault} disabledTitle="جعبه پیش‌فرض باید فعال بماند" />
                              <Link href={`/admin/packaging/${box.id}/edit`} title="ویرایش جعبه" aria-label={`ویرایش ${box.name}`} className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><SquarePen size={15} strokeWidth={1.5} /></Link>
                              {!box.isDefault && <PackagingBoxDeleteButton id={box.id} name={box.name} />}
                            </div>
                          </BpTd>
                        </AdminBulkTr>
                      ))}
                    </tbody>
                  </BpTable>
                </AdminBulkEditor>
              </AdminColumnVisibility>
            </>
          ) : <div className="p-6"><AdminEmptyState title="جعبه‌ای پیدا نشد" description="هیچ جعبه‌ای با جستجو و فیلترهای انتخابی مطابقت ندارد." /></div>}
        </>
      ) : <AdminEmptyState title="هنوز جعبه‌ای تعریف نشده" description="برای دقت در محاسبه هزینه ارسال، حداقل یک جعبه اضافه کنید." />}
    </AdminPanel>
  );
}
