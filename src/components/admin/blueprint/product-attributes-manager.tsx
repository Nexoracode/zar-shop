"use client";

import { useEffect, useRef, useState } from "react";
import { PackageSearch, Search, SlidersHorizontal, X } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { productStatusLabels, productStatusTones } from "@/modules/admin/labels";
import type { CategoryAttributeGroup, ProductAttributeValue } from "@/modules/products/attributes";
import { ProductAttributeValuesEditor } from "./product-attributes-form";
import { BpButton, BpSpinner } from "./ui";

type ProductResult = { id: string; name: string; sku: string; status: keyof typeof productStatusLabels; category: { name: string } | null };
type LoadedProduct = {
  productId: string;
  productName: string;
  productSku: string;
  categoryId: string | null;
  categoryName: string | null;
  groups: CategoryAttributeGroup[];
  initialAttributes: ProductAttributeValue[];
};

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`bp-frame relative p-[18px] ${className}`.trim()}>{children}</section>;
}

export function BlueprintProductAttributesManager() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<{ query: string; results: ProductResult[]; error: string | null }>({ query: "", results: [], error: null });
  const searchController = useRef<AbortController | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const loadController = useRef<AbortController | null>(null);

  const normalizedQuery = query.trim();
  const settled = search.query === normalizedQuery;
  const searching = normalizedQuery.length >= 3 && !settled;
  const results = settled ? search.results : [];
  const searchError = settled ? search.error : null;
  const remaining = Math.max(0, 3 - normalizedQuery.length);

  useEffect(() => {
    if (normalizedQuery.length < 3) return;
    const controller = new AbortController();
    searchController.current = controller;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/products/search?q=${encodeURIComponent(normalizedQuery)}`, { signal: controller.signal });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.message ?? "جستجوی محصولات انجام نشد.");
        setSearch({ query: normalizedQuery, results: Array.isArray(result) ? result : [], error: null });
      } catch (reason) {
        if (!controller.signal.aborted) setSearch({ query: normalizedQuery, results: [], error: reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد." });
      }
    }, 400);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [normalizedQuery]);

  useEffect(() => () => { searchController.current?.abort(); loadController.current?.abort(); }, []);

  async function select(id: string) {
    if (id === selectedId && loaded) return;
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setSelectedId(id);
    setLoaded(null);
    setLoadError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/products/${id}/attributes`, { signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message ?? "اطلاعات ویژگی‌های محصول دریافت نشد.");
      if (!controller.signal.aborted) setLoaded(data as LoadedProduct);
    } catch (reason) {
      if (!controller.signal.aborted) setLoadError(reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader flush title="ویژگی‌های محصولات" description="محصول را از کادر جست‌وجو انتخاب کنید و مقادیر ویژگی‌های توصیفی آن را — بر اساس ساختار دسته‌بندی‌اش — تکمیل کنید." />

      <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-20">
          <Panel>
            <div className="mb-3 flex items-center gap-2 border-b border-[var(--bp-divider)] pb-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-muted)]"><PackageSearch size={16} /></span>
              <div className="min-w-0">
                <strong className="block text-[13px]">انتخاب محصول</strong>
                <span className="bp-muted block text-[11px]">نام، کد کالا یا نشانی انگلیسی</span>
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--bp-muted)]" size={15} />
              <input type="search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} aria-label="جستجوی محصول" placeholder="حداقل ۳ نویسه" className="bp-input bp-input-search" />
              {searching ? (
                <span className="absolute end-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--bp-accent)]"><BpSpinner size={15} /></span>
              ) : query ? (
                <BpButton isIconOnly size="sm" variant="ghost" aria-label="پاک‌کردن جستجو" onClick={() => setQuery("")} className="absolute end-1 top-1/2 z-20 h-7 min-h-7 w-7 min-w-7 -translate-y-1/2"><X size={14} /></BpButton>
              ) : null}
            </div>
            <p className="bp-muted m-0 mt-1.5 text-[11px]" aria-live="polite">
              {searching ? "در حال جستجو…"
                : normalizedQuery.length > 0 && remaining > 0 ? `${remaining.toLocaleString("fa-IR")} نویسهٔ دیگر وارد کنید.`
                : settled && normalizedQuery.length >= 3 ? `${results.length.toLocaleString("fa-IR")} محصول پیدا شد.`
                : "جستجو از نویسهٔ سوم آغاز می‌شود."}
            </p>

            {searchError && <p className="m-0 mt-3 border border-[var(--bp-danger)] bg-[color-mix(in_srgb,var(--bp-danger)_8%,transparent)] px-3 py-2 text-[12px] text-[var(--bp-danger)]">{searchError}</p>}

            {settled && normalizedQuery.length >= 3 && !searchError && (
              <div className="bp-scroll mt-3 grid max-h-[min(520px,calc(100dvh-260px))] grid-cols-1 content-start gap-1.5 overflow-y-auto">
                {results.length ? results.map((product) => {
                  const active = selectedId === product.id;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => void select(product.id)}
                      className={`grid min-w-0 gap-1 border p-2.5 text-start transition ${active ? "border-[var(--bp-accent)] bg-[var(--bp-accent-100)]" : "border-[var(--bp-divider)] hover:border-[var(--bp-accent)]"}`}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <SlidersHorizontal size={13} className="shrink-0 text-[var(--bp-muted)]" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{product.name}</span>
                        <span className="shrink-0"><AdminStatusBadge tone={productStatusTones[product.status]}>{productStatusLabels[product.status]}</AdminStatusBadge></span>
                      </span>
                      <span className="bp-muted min-w-0 truncate text-[10px]"><span dir="ltr" className="font-mono">{product.sku}</span> · {product.category?.name ?? "بدون دسته‌بندی"}</span>
                    </button>
                  );
                }) : <p className="bp-muted m-0 p-4 text-center text-[12px]">محصولی پیدا نشد.</p>}
              </div>
            )}
          </Panel>
        </aside>

        <div className="min-w-0">
          {loading ? (
            <Panel className="grid min-h-[320px] place-items-center text-center">
              <span className="grid justify-items-center gap-3"><BpSpinner size={22} /><span className="bp-muted text-[12px]">در حال بارگذاری ویژگی‌ها…</span></span>
            </Panel>
          ) : loadError ? (
            <Panel className="grid min-h-[240px] place-items-center">
              <span className="grid justify-items-center gap-3 text-center">
                <span className="text-[13px] text-[var(--bp-danger)]">{loadError}</span>
                {selectedId && <BpButton type="button" onClick={() => void select(selectedId)}>تلاش دوباره</BpButton>}
              </span>
            </Panel>
          ) : loaded && selectedId ? (
            <ProductAttributeValuesEditor
              key={loaded.productId}
              productId={loaded.productId}
              productName={loaded.productName}
              productSku={loaded.productSku}
              categoryId={loaded.categoryId}
              categoryName={loaded.categoryName}
              initialGroups={loaded.groups}
              initialAttributes={loaded.initialAttributes}
            />
          ) : (
            <Panel className="min-h-[320px]">
              <AdminEmptyState title="ابتدا یک محصول انتخاب کنید" description="فرم ویژگی‌های محصول پس از جست‌وجو و انتخاب محصول از کادر کنار صفحه فعال می‌شود." />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
