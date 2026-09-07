"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Scale, Star, Trash2, X } from "lucide-react";
import { useCompare } from "@/components/compare-provider";
import type { ComparisonResult } from "@/modules/compare/service";

const EMPTY: ComparisonResult = { products: [], attributeNames: [] };

function valuesFor(product: ComparisonResult["products"][number], attributeName: string) {
  return product.attributes.find((row) => row.name === attributeName)?.values ?? [];
}

export function CompareView() {
  const { items, remove, clear } = useCompare();
  const [data, setData] = useState<ComparisonResult>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  // The `ids` string the current `data` was fetched for — only a matching, successful response
  // is allowed to prune the list, so an offline fetch never wipes the shopper's picks.
  const resolvedIds = useRef<string>("");
  const reconciled = useRef<string>("");

  const ids = useMemo(() => items.map((item) => item.id).join(","), [items]);

  useEffect(() => {
    if (!ids) { resolvedIds.current = ""; return; }
    const controller = new AbortController();
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const response = await fetch(`/api/compare?ids=${encodeURIComponent(ids)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("compare request failed");
        const result: ComparisonResult = await response.json();
        if (cancelled) return;
        setData(result);
        resolvedIds.current = ids;
      } catch {
        /* aborted or offline — keep whatever is shown */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => { cancelled = true; controller.abort(); };
  }, [ids]);

  // A product that no longer comes back (unpublished, wrong industry) is dropped from the list so
  // the tray and this page cannot disagree — but only against a fresh response for these exact ids.
  useEffect(() => {
    if (loading || !ids || resolvedIds.current !== ids || reconciled.current === ids) return;
    reconciled.current = ids;
    const live = new Set(data.products.map((product) => product.id));
    for (const item of items) if (!live.has(item.id)) remove(item.id);
  }, [data, ids, items, loading, remove]);

  if (items.length === 0) {
    return (
      <div className="grid min-h-[50vh] place-items-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <div>
          <Scale size={44} className="mx-auto text-[var(--muted)]" />
          <strong className="mt-4 block text-sm">فهرست مقایسه خالی است</strong>
          <p className="mx-auto mb-0 mt-2 max-w-md text-xs leading-6 text-[var(--muted)]">از صفحهٔ هر محصول با دکمهٔ «افزودن به مقایسه»، کالاها را اینجا کنار هم بگذارید.</p>
          <Link href="/products" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)]">مشاهدهٔ محصولات</Link>
        </div>
      </div>
    );
  }

  const { products, attributeNames } = data;
  const visibleAttributes = onlyDifferences
    ? attributeNames.filter((name) => {
      const rendered = products.map((product) => valuesFor(product, name).join("، "));
      return new Set(rendered).size > 1;
    })
    : attributeNames;
  const columnWidth = "min-w-[200px] max-w-[240px]";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-xs text-[var(--muted)]">
          {items.length.toLocaleString("fa-IR")} کالا در فهرست مقایسه
          {items[0]?.categoryName ? ` · دستهٔ «${items[0].categoryName}»` : ""}
        </p>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[var(--foreground)]">
            <input type="checkbox" checked={onlyDifferences} onChange={(event) => setOnlyDifferences(event.target.checked)} className="size-4 accent-[var(--brand-primary)]" />
            فقط تفاوت‌ها
          </label>
          <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]">
            <Trash2 size={14} />حذف همه
          </button>
        </div>
      </div>

      {loading && products.length === 0 ? (
        <div className="grid min-h-[40vh] place-items-center text-sm text-[var(--muted)]">در حال بارگذاری…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full border-collapse text-right text-sm">
            <thead>
              <tr>
                <th className="sticky right-0 z-10 w-[130px] min-w-[130px] bg-[var(--surface)] p-3 align-top text-xs font-bold text-[var(--muted)]">کالا</th>
                {products.map((product) => (
                  <th key={product.id} className={`${columnWidth} border-r border-[var(--border)] p-3 align-top font-normal`}>
                    <div className="relative flex flex-col items-center gap-2 text-center">
                      <button type="button" onClick={() => remove(product.id)} aria-label={`حذف ${product.name} از مقایسه`} className="absolute -left-1 -top-1 grid size-6 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:text-[var(--danger)]"><X size={13} /></button>
                      <Link href={product.href} className="grid size-24 place-items-center overflow-hidden rounded-lg border border-[var(--border)] bg-white">
                        {product.image ? <Image src={product.image} alt={product.name} width={96} height={96} className="size-full object-contain p-1.5" /> : <Scale size={20} className="text-[var(--muted)]" />}
                      </Link>
                      <Link href={product.href} className="line-clamp-2 text-xs font-bold leading-6 text-[var(--foreground)] transition hover:text-[var(--brand-primary)]">{product.name}</Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <CompareRow label="قیمت" products={products}>
                {(product) => product.price ? (
                  <div className="flex flex-col items-center gap-0.5">
                    {product.originalPrice && <span className="text-[11px] text-[var(--muted)] line-through">{product.originalPrice}</span>}
                    <strong className="text-[13px] font-bold text-[var(--brand-primary)]">{product.price}</strong>
                    {product.discountPercent ? <span className="rounded-full bg-[var(--danger)] px-1.5 text-[10px] font-bold text-white">٪{product.discountPercent.toLocaleString("fa-IR")}</span> : null}
                  </div>
                ) : <span className="text-xs text-[var(--muted)]">نامشخص</span>}
              </CompareRow>
              <CompareRow label="موجودی" products={products}>
                {(product) => <span className={`text-xs font-bold ${product.inStock ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{product.inStock ? "موجود" : "ناموجود"}</span>}
              </CompareRow>
              <CompareRow label="امتیاز" products={products}>
                {(product) => product.rating != null ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold"><Star size={13} className="fill-[var(--warning)] text-[var(--warning)]" />{product.rating.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}<span className="font-normal text-[var(--muted)]">({product.reviewCount.toLocaleString("fa-IR")})</span></span>
                ) : <span className="text-xs text-[var(--muted)]">—</span>}
              </CompareRow>

              {visibleAttributes.map((name) => (
                <CompareRow key={name} label={name} products={products}>
                  {(product) => {
                    const values = valuesFor(product, name);
                    return values.length ? <span className="text-xs leading-6 text-[var(--foreground)]">{values.join("، ")}</span> : <span className="text-xs text-[var(--muted)]">—</span>;
                  }}
                </CompareRow>
              ))}

              <tr>
                <td className="sticky right-0 z-10 bg-[var(--surface)] p-3" />
                {products.map((product) => (
                  <td key={product.id} className="border-r border-t border-[var(--border)] p-3 text-center">
                    <Link href={product.href} className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[var(--brand-primary)] px-4 text-xs font-bold text-[var(--brand-primary-foreground)]">مشاهدهٔ محصول</Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {items.length < 2 && (
        <p className="m-0 rounded-xl bg-[color-mix(in_srgb,var(--info)_9%,var(--surface))] p-3 text-center text-xs font-bold text-[var(--info)]">برای مقایسه، حداقل دو کالا از یک دسته‌بندی اضافه کنید.</p>
      )}
      {onlyDifferences && visibleAttributes.length === 0 && products.length > 1 && (
        <p className="m-0 text-center text-xs text-[var(--muted)]">این کالاها در ویژگی‌های ثبت‌شده تفاوتی ندارند.</p>
      )}
    </div>
  );
}

function CompareRow({ label, products, children }: { label: string; products: ComparisonResult["products"]; children: (product: ComparisonResult["products"][number]) => ReactNode }) {
  return (
    <tr className="border-t border-[var(--border)]">
      <th scope="row" className="sticky right-0 z-10 bg-[var(--surface)] p-3 align-top text-xs font-bold text-[var(--muted)]">{label}</th>
      {products.map((product) => (
        <td key={product.id} className="border-r border-[var(--border)] p-3 text-center align-top">{children(product)}</td>
      ))}
    </tr>
  );
}
