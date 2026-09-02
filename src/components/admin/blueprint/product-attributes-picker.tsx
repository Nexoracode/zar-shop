"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PackageSearch, Search, SlidersHorizontal, X } from "lucide-react";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { BpButton, BpSpinner } from "./ui";
import { productStatusLabels, productStatusTones } from "@/modules/admin/labels";

type ProductResult = { id: string; name: string; sku: string; status: keyof typeof productStatusLabels; category: { name: string } | null };

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="bp-frame relative p-[18px]">{children}</section>;
}

export function BlueprintProductAttributesPicker() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<{ query: string; results: ProductResult[]; error: string | null }>({ query: "", results: [], error: null });
  const controllerRef = useRef<AbortController | null>(null);

  const normalizedQuery = query.trim();
  const settled = state.query === normalizedQuery;
  const loading = normalizedQuery.length >= 3 && !settled;
  const results = settled ? state.results : [];
  const error = settled ? state.error : null;
  const remaining = Math.max(0, 3 - normalizedQuery.length);

  useEffect(() => {
    if (normalizedQuery.length < 3) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/products/search?q=${encodeURIComponent(normalizedQuery)}`, { signal: controller.signal });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.message ?? "جستجوی محصولات انجام نشد.");
        setState({ query: normalizedQuery, results: Array.isArray(result) ? result : [], error: null });
      } catch (reason) {
        if (!controller.signal.aborted) setState({ query: normalizedQuery, results: [], error: reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد." });
      }
    }, 400);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [normalizedQuery]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader flush eyebrow="تنوع و ویژگی‌ها" title="ویژگی‌های محصولات" description="محصول را جست‌وجو کنید و مقادیر ویژگی‌های توصیفی آن را — بر اساس ساختار دسته‌بندی‌اش — تکمیل کنید." />

      <Panel>
        <div className="mb-3 flex items-center gap-3 border-b border-[var(--bp-divider)] pb-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-muted)]"><PackageSearch size={17} /></span>
          <div className="min-w-0">
            <strong className="block text-[13px]">انتخاب محصول</strong>
            <span className="bp-muted block text-[11px]">نام، کد کالا یا نشانی انگلیسی محصول را بنویسید.</span>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--bp-muted)]" size={15} />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="جستجوی محصول"
            placeholder="حداقل ۳ نویسه"
            className="bp-input bp-input-search"
          />
          {loading ? (
            <span className="absolute end-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--bp-accent)]"><BpSpinner size={15} /></span>
          ) : query ? (
            <BpButton isIconOnly size="sm" variant="ghost" aria-label="پاک‌کردن جستجو" onClick={() => setQuery("")} className="absolute end-1 top-1/2 z-20 h-7 min-h-7 w-7 min-w-7 -translate-y-1/2"><X size={14} /></BpButton>
          ) : null}
        </div>
        <p className="bp-muted m-0 mt-1.5 text-[11px]" aria-live="polite">
          {loading ? "در حال جستجو…"
            : normalizedQuery.length > 0 && remaining > 0 ? `${remaining.toLocaleString("fa-IR")} نویسهٔ دیگر وارد کنید.`
            : settled && normalizedQuery.length >= 3 ? `${results.length.toLocaleString("fa-IR")} محصول پیدا شد.`
            : "جستجو از نویسهٔ سوم آغاز می‌شود."}
        </p>

        {error && <p className="m-0 mt-3 border border-[var(--bp-danger)] bg-[color-mix(in_srgb,var(--bp-danger)_8%,transparent)] px-3 py-2 text-[12px] text-[var(--bp-danger)]">{error}</p>}

        {settled && normalizedQuery.length >= 3 && !error && (
          results.length ? (
            <ul className="m-0 mt-3 grid list-none gap-2 p-0">
              {results.map((product) => (
                <li key={product.id}>
                  <Link href={`/admin/products/${product.id}/attributes`} className="flex items-center gap-3 border border-[var(--bp-divider)] p-3 hover:border-[var(--bp-accent)]">
                    <span className="grid h-8 w-8 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-muted)]"><SlidersHorizontal size={14} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold">{product.name}</span>
                      <span className="bp-muted block truncate text-[11px]">
                        <span dir="ltr" className="font-mono">{product.sku}</span> · {product.category?.name ?? "بدون دسته‌بندی"}
                      </span>
                    </span>
                    <AdminStatusBadge tone={productStatusTones[product.status]}>{productStatusLabels[product.status]}</AdminStatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="bp-muted m-0 mt-3 border border-dashed border-[var(--bp-divider)] p-6 text-center text-[12px]">محصولی با این عبارت پیدا نشد.</p>
          )
        )}
      </Panel>
    </div>
  );
}
