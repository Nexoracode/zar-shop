"use client";

import Link from "next/link";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { AdminReadOnlyTableToolbar } from "@/components/admin-table-refresh";
import { normalizeSearchText } from "@/lib/text-search";
import { BpListFilters, BpTable, BpTd, BpTh } from "./ui";

export type CategoryAttributeRow = {
  id: string;
  name: string;
  slug: string;
  parentName: string | null;
  isActive: boolean;
  productCount: number;
  groupCount: number;
  attributeCount: number;
};

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="bp-frame relative p-[18px]">{children}</section>;
}

export function BlueprintCategoryAttributesList({ categories }: { categories: CategoryAttributeRow[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [definedFilter, setDefinedFilter] = useState("");

  const normalizedQuery = normalizeSearchText(query);
  const visible = categories.filter((category) => {
    if (normalizedQuery && !normalizeSearchText(`${category.name} ${category.slug} ${category.parentName ?? ""}`).includes(normalizedQuery)) return false;
    if (statusFilter === "active" && !category.isActive) return false;
    if (statusFilter === "inactive" && category.isActive) return false;
    if (definedFilter === "yes" && category.attributeCount === 0) return false;
    if (definedFilter === "no" && category.attributeCount > 0) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader flush eyebrow="تنوع و ویژگی‌ها" title="ویژگی‌های دسته‌بندی" description="برای هر دسته‌بندی، گروه‌ها و ویژگی‌های توصیفی مخصوص محصولات همان دسته را تعریف کنید." />

      <Panel>
        {categories.length ? (
          <>
            <BpListFilters
              query={query}
              onQueryChange={setQuery}
              searchLabel="جستجوی دسته‌بندی"
              searchPlaceholder="جستجو بر اساس نام، نشانی یا دسته والد"
              filters={[
                { name: "status", ariaLabel: "وضعیت دسته‌بندی", value: statusFilter, onChange: setStatusFilter, options: [{ value: "", label: "همه وضعیت‌ها" }, { value: "active", label: "فعال" }, { value: "inactive", label: "غیرفعال" }] },
                { name: "defined", ariaLabel: "وضعیت تعریف ویژگی", value: definedFilter, onChange: setDefinedFilter, options: [{ value: "", label: "ویژگی: همه" }, { value: "yes", label: "دارای ویژگی" }, { value: "no", label: "بدون ویژگی" }] },
              ]}
            />
            {visible.length ? (
              <>
                <div className="grid gap-2 p-3 md:hidden">
                  {visible.map((category) => (
                    <Link key={category.id} href={`/admin/categories/${category.id}/attributes`} className="flex flex-col gap-2 border border-[var(--bp-divider)] p-3">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal size={15} className="shrink-0 text-[var(--bp-muted)]" aria-hidden />
                        <strong className="min-w-0 flex-1 truncate text-sm">{category.name}</strong>
                        <AdminStatusBadge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge>
                      </div>
                      <span className="bp-muted text-[11px]">{category.parentName ?? "دسته اصلی"}</span>
                      <span className="bp-muted text-[11px]">{category.groupCount.toLocaleString("fa-IR")} گروه · {category.attributeCount.toLocaleString("fa-IR")} ویژگی · {category.productCount.toLocaleString("fa-IR")} محصول</span>
                    </Link>
                  ))}
                </div>

                <div className="hidden md:block">
                  <AdminReadOnlyTableToolbar label="فهرست دسته‌بندی‌ها" description="ساختار ویژگی هر دسته را از ستون عملیات باز کنید." />
                  <BpTable ariaLabel="فهرست ویژگی‌های دسته‌بندی‌ها" minWidth={720}>
                    <thead>
                      <tr>
                        <BpTh>دسته‌بندی</BpTh>
                        <BpTh>والد</BpTh>
                        <BpTh>گروه‌ها</BpTh>
                        <BpTh>ویژگی‌ها</BpTh>
                        <BpTh>محصولات</BpTh>
                        <BpTh>وضعیت</BpTh>
                        <BpTh className="text-center">عملیات</BpTh>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((category) => (
                        <tr key={category.id}>
                          <BpTd className="max-w-[220px]">
                            <span className="block truncate font-bold" title={category.name}>{category.name}</span>
                            <span dir="ltr" className="bp-muted block truncate text-right font-mono text-[11px]">{category.slug}</span>
                          </BpTd>
                          <BpTd className="bp-muted max-w-[140px] truncate" title={category.parentName ?? "دسته اصلی"}>{category.parentName ?? "دسته اصلی"}</BpTd>
                          <BpTd className="text-[var(--bp-text)]">{category.groupCount.toLocaleString("fa-IR")}</BpTd>
                          <BpTd className="text-[var(--bp-text)]">{category.attributeCount.toLocaleString("fa-IR")}</BpTd>
                          <BpTd className="text-[var(--bp-text)]">{category.productCount.toLocaleString("fa-IR")}</BpTd>
                          <BpTd><AdminStatusBadge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></BpTd>
                          <BpTd>
                            <div className="flex items-center justify-center">
                              <Link href={`/admin/categories/${category.id}/attributes`} aria-label={`مدیریت ویژگی‌های دسته‌بندی ${category.name}`} title="مدیریت ویژگی‌ها" className="bp-btn bp-btn-secondary bp-btn-icon bp-btn-sm"><SlidersHorizontal size={14} /></Link>
                            </div>
                          </BpTd>
                        </tr>
                      ))}
                    </tbody>
                  </BpTable>
                </div>
              </>
            ) : <div className="p-6"><AdminEmptyState title="دسته‌بندی‌ای پیدا نشد" description="هیچ دسته‌بندی‌ای با جستجو و فیلترهای انتخابی مطابقت ندارد." /></div>}
          </>
        ) : <AdminEmptyState title="دسته‌بندی‌ای ثبت نشده" description="ابتدا از بخش «دسته‌بندی‌ها» دسته‌ها را بسازید، سپس ویژگی‌هایشان را اینجا تعریف کنید." />}
      </Panel>
    </div>
  );
}
