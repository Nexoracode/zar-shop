"use client";

import { useEffect, useRef, useState } from "react";
import { FolderSearch, Search, SlidersHorizontal, X } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { normalizeSearchText } from "@/lib/text-search";
import type { CategoryAttributeGroup } from "@/modules/products/attributes";
import { CategoryAttributeSchemaEditor } from "./category-attributes-form";
import { BpButton, BpSpinner } from "./ui";

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

type LoadedCategory = { id: string; name: string; groups: CategoryAttributeGroup[]; usedAttributeIds: string[] };

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`bp-frame relative p-[18px] ${className}`.trim()}>{children}</section>;
}

export function BlueprintCategoryAttributesManager({ categories }: { categories: CategoryAttributeRow[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);

  const normalizedQuery = normalizeSearchText(query);
  const results = normalizedQuery
    ? categories.filter((category) => normalizeSearchText(`${category.name} ${category.slug} ${category.parentName ?? ""}`).includes(normalizedQuery))
    : categories;

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function select(id: string) {
    if (id === selectedId && loaded) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setSelectedId(id);
    setLoaded(null);
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/categories/${id}/attributes`, { signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message ?? "اطلاعات ویژگی‌های دسته‌بندی دریافت نشد.");
      if (!controller.signal.aborted) setLoaded(data as LoadedCategory);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader flush eyebrow="تنوع و ویژگی‌ها" title="ویژگی‌های دسته‌بندی" description="دسته‌بندی را از فهرست انتخاب کنید و گروه‌ها و ویژگی‌های توصیفی مخصوص محصولات همان دسته را تعریف کنید." />

      <div className="grid items-start gap-2 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20">
          <Panel>
            <div className="mb-3 flex items-center gap-2 border-b border-[var(--bp-divider)] pb-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-muted)]"><FolderSearch size={16} /></span>
              <div className="min-w-0">
                <strong className="block text-[13px]">انتخاب دسته‌بندی</strong>
                <span className="bp-muted block text-[11px]">{results.length.toLocaleString("fa-IR")} دسته‌بندی</span>
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--bp-muted)]" size={15} />
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="جستجوی دسته‌بندی" placeholder="نام، نشانی یا دسته والد" className="bp-input bp-input-search" />
              {query ? <BpButton isIconOnly size="sm" variant="ghost" aria-label="پاک‌کردن جستجو" onClick={() => setQuery("")} className="absolute end-1 top-1/2 z-20 h-7 min-h-7 w-7 min-w-7 -translate-y-1/2"><X size={14} /></BpButton> : null}
            </div>

            <div className="bp-scroll mt-2 grid max-h-[min(560px,calc(100dvh-220px))] content-start gap-1.5 overflow-y-auto">
              {results.length ? results.map((category) => {
                const active = selectedId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => void select(category.id)}
                    className={`grid gap-1 border p-2.5 text-start transition ${active ? "border-[var(--bp-accent)] bg-[var(--bp-accent-100)]" : "border-[var(--bp-divider)] hover:border-[var(--bp-accent)]"}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal size={13} className="shrink-0 text-[var(--bp-muted)]" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{category.name}</span>
                      <AdminStatusBadge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge>
                    </span>
                    <span className="bp-muted truncate text-[10px]">{category.parentName ?? "دسته اصلی"}</span>
                    <span className="bp-muted text-[10px]">{category.groupCount.toLocaleString("fa-IR")} گروه · {category.attributeCount.toLocaleString("fa-IR")} ویژگی · {category.productCount.toLocaleString("fa-IR")} محصول</span>
                  </button>
                );
              }) : <p className="bp-muted m-0 p-4 text-center text-[12px]">دسته‌بندی‌ای پیدا نشد.</p>}
            </div>
          </Panel>
        </aside>

        <div className="min-w-0">
          {loading ? (
            <Panel className="grid min-h-[320px] place-items-center text-center">
              <span className="grid justify-items-center gap-3"><BpSpinner size={22} /><span className="bp-muted text-[12px]">در حال بارگذاری ساختار ویژگی‌ها…</span></span>
            </Panel>
          ) : error ? (
            <Panel className="grid min-h-[240px] place-items-center">
              <span className="grid justify-items-center gap-3 text-center">
                <span className="text-[13px] text-[var(--bp-danger)]">{error}</span>
                {selectedId && <BpButton type="button" onClick={() => void select(selectedId)}>تلاش دوباره</BpButton>}
              </span>
            </Panel>
          ) : loaded && selectedId ? (
            <CategoryAttributeSchemaEditor
              key={loaded.id}
              categoryId={loaded.id}
              categoryName={loaded.name}
              initialGroups={loaded.groups}
              usedAttributeIds={loaded.usedAttributeIds}
            />
          ) : (
            <Panel className="min-h-[320px]">
              <AdminEmptyState title="ابتدا یک دسته‌بندی انتخاب کنید" description="فرم تعریف گروه‌ها و ویژگی‌ها پس از انتخاب دسته‌بندی از فهرست کنار صفحه فعال می‌شود." />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
