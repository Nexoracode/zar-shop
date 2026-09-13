"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Modal, Spinner } from "@heroui/react";
import { ArrowRight, ArrowDownUp, Check, ChevronLeft, SlidersHorizontal, X } from "lucide-react";
import { FilterCheckbox, PriceRangeSlider, type Facets } from "@/components/storefront-catalog-filters";
import { greatestCommonDivisor, normalizeSliderValue, useCatalogFilterActions } from "@/lib/use-catalog-filter-actions";

type SortOption = { id: string; label: string };
type BooleanFacetKey = "inStock" | "hasDiscount" | "freeShipping" | "sameDayDelivery";
type FacetKey = "price" | "brand" | "color" | `attribute:${string}`;

type Props = {
  facets: Facets;
  categoryScoped: boolean;
  selectedBrands: string[];
  selectedColors: string[];
  selectedAttributes: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  hasDiscount?: boolean;
  freeShipping?: boolean;
  sameDayDelivery?: boolean;
  resetHref: string;
  sortOptions: readonly SortOption[];
  currentSort?: string;
};

// Digikala's own mobile product-list page (measured directly from the live DOM, including
// clicking through it): below the header, a horizontally scrollable row of pill chips — one per
// filterable facet, plus "فیلتر" (a top-level list of every facet name) and sort — each chip
// opening *that exact facet's own* bottom sheet directly, not a shared sheet scrolled to the
// right section. Tapping a facet row from inside the "فیلتر" list drills into that same
// single-facet sheet with a back arrow instead of a close button. Below the chip row, a second
// row of instant on/off chips for the simple yes/no facets, and (once anything is selected) a
// row of removable chips summarizing what's active.
export function StorefrontCatalogFilterBar({ facets, categoryScoped, selectedBrands, selectedColors, selectedAttributes, minPrice, maxPrice, inStock, hasDiscount, freeShipping, sameDayDelivery, resetHref, sortOptions, currentSort }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isPending, updateMultiValue, updateBooleanValue, updatePrice } = useCatalogFilterActions();
  const [sheet, setSheet] = useState<"list" | "sort" | FacetKey | null>(null);
  const [cameFromList, setCameFromList] = useState(false);
  const [priceValues, setPriceValues] = useState<[number, number] | null>(null);

  const priceBounds = facets.priceRange ?? { min: 0, max: 1 };
  const hasPriceRange = facets.priceRange !== null && facets.priceRange.min !== facets.priceRange.max;
  const priceStep = Math.max(1, greatestCommonDivisor(priceBounds.max - priceBounds.min, 1_000_000));
  const priceActive = minPrice !== undefined || maxPrice !== undefined;
  const currentPriceValues = priceValues ?? [
    Math.min(Math.max(minPrice ?? priceBounds.min, priceBounds.min), priceBounds.max),
    Math.max(Math.min(maxPrice ?? priceBounds.max, priceBounds.max), priceBounds.min),
  ] as [number, number];

  function openFacet(key: FacetKey, fromList: boolean) {
    setPriceValues(null);
    setCameFromList(fromList);
    setSheet(key);
  }

  function closeSheet() {
    setSheet(null);
    setCameFromList(false);
  }

  function hrefWithout(name: string, value?: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === undefined) next.delete(name);
    else {
      const remaining = next.getAll(name).filter((item) => item !== value);
      next.delete(name);
      for (const item of remaining) next.append(name, item);
    }
    next.delete("page");
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function hrefToggle(name: BooleanFacetKey, active: boolean | undefined) {
    const next = new URLSearchParams(searchParams.toString());
    if (active) next.delete(name); else next.set(name, "1");
    next.delete("page");
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function hrefSort(id: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("sortby", id);
    next.delete("page");
    return `${pathname}?${next.toString()}`;
  }

  const currentSortLabel = sortOptions.find((option) => option.id === currentSort)?.label;

  const facetRows: Array<{ key: FacetKey; label: string; active: boolean }> = [
    ...(hasPriceRange ? [{ key: "price" as const, label: "محدوده قیمت", active: priceActive }] : []),
    ...(!categoryScoped && facets.brands.length > 0 ? [{ key: "brand" as const, label: "برند", active: selectedBrands.length > 0 }] : []),
    ...(categoryScoped && facets.colors.length > 0 ? [{ key: "color" as const, label: "رنگ", active: selectedColors.length > 0 }] : []),
    ...(categoryScoped ? facets.attributes.map((attribute) => ({ key: `attribute:${attribute.id}` as FacetKey, label: attribute.name, active: selectedAttributes.some((token) => token.startsWith(`${attribute.id}::`)) })) : []),
  ];

  const appliedChips: Array<{ key: string; label: string; href: string }> = [];
  if (priceActive) appliedChips.push({ key: "price", label: "محدوده قیمت", href: `${pathname}?${(() => { const next = new URLSearchParams(searchParams.toString()); next.delete("MinPrice"); next.delete("MaxPrice"); next.delete("page"); return next.toString(); })()}` });
  for (const brand of selectedBrands) appliedChips.push({ key: `brand-${brand}`, label: brand, href: hrefWithout("brand", brand) });
  for (const colorId of selectedColors) appliedChips.push({ key: `color-${colorId}`, label: facets.colors.find((color) => color.id === colorId)?.name ?? colorId, href: hrefWithout("color", colorId) });
  for (const token of selectedAttributes) appliedChips.push({ key: `attr-${token}`, label: token.split("::")[1] ?? token, href: hrefWithout("attr", token) });
  if (inStock) appliedChips.push({ key: "inStock", label: "کالاهای موجود", href: hrefToggle("inStock", true) });
  if (hasDiscount) appliedChips.push({ key: "hasDiscount", label: "دارای تخفیف", href: hrefToggle("hasDiscount", true) });
  if (freeShipping) appliedChips.push({ key: "freeShipping", label: "ارسال رایگان", href: hrefToggle("freeShipping", true) });
  if (sameDayDelivery) appliedChips.push({ key: "sameDayDelivery", label: "ارسال امروز", href: hrefToggle("sameDayDelivery", true) });

  const chipClass = (active: boolean) => `inline-flex min-h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-xs transition ${active ? "border-[var(--brand-primary)] text-[var(--brand-primary)]" : "border-slate-200 text-slate-700"}`;

  const facetTitle = sheet === "list" ? "فیلترها"
    : sheet === "price" ? "محدوده قیمت"
    : sheet === "brand" ? "برند"
    : sheet === "color" ? "رنگ"
    : sheet?.startsWith("attribute:") ? facets.attributes.find((attribute) => `attribute:${attribute.id}` === sheet)?.name ?? ""
    : "";

  function renderFacetBody(key: FacetKey) {
    if (key === "price") {
      return (
        <div className="p-1">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 px-3">
            <div className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-200">
              <span className="shrink-0 text-[10px] text-slate-500">از</span>
              <span className="flex min-w-0 items-baseline gap-1"><strong dir="ltr" className="text-[13px] font-bold tabular-nums text-slate-900">{currentPriceValues[0].toLocaleString("fa-IR")}</strong><span className="shrink-0 text-[9px] text-slate-500">تومان</span></span>
            </div>
            <div className="flex min-h-12 items-center justify-between gap-3">
              <span className="shrink-0 text-[10px] text-slate-500">تا</span>
              <span className="flex min-w-0 items-baseline gap-1"><strong dir="ltr" className="text-[13px] font-bold tabular-nums text-slate-900">{currentPriceValues[1].toLocaleString("fa-IR")}</strong><span className="shrink-0 text-[9px] text-slate-500">تومان</span></span>
            </div>
          </div>
          <PriceRangeSlider bounds={priceBounds} step={priceStep} value={currentPriceValues} onChange={(value) => setPriceValues(normalizeSliderValue(value))} onChangeEnd={(value) => updatePrice(priceBounds, value)} />
        </div>
      );
    }
    if (key === "brand") {
      const selectedSet = new Set(selectedBrands);
      return <div className="p-1">{facets.brands.map((brand) => <FilterCheckbox key={brand.value} selected={selectedSet.has(brand.value)} onChange={(selected) => updateMultiValue("brand", brand.value, selected)}><span className="flex min-w-0 items-center gap-2 text-sm text-slate-700"><span className="truncate">{brand.value}</span><span className="mr-auto text-[11px] text-slate-400">{brand.count.toLocaleString("fa-IR")}</span></span></FilterCheckbox>)}</div>;
    }
    if (key === "color") {
      const selectedSet = new Set(selectedColors);
      return <div className="p-1">{facets.colors.map((color) => <FilterCheckbox key={color.id} selected={selectedSet.has(color.id)} onChange={(selected) => updateMultiValue("color", color.id, selected)}><span className="flex min-w-0 items-center gap-2 text-sm text-slate-700"><span className="size-4 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} /><span className="truncate">{color.name}</span><span className="mr-auto text-[11px] text-slate-400">{color.count.toLocaleString("fa-IR")}</span></span></FilterCheckbox>)}</div>;
    }
    const attributeId = key.slice("attribute:".length);
    const attribute = facets.attributes.find((item) => item.id === attributeId);
    if (!attribute) return null;
    const selectedSet = new Set(selectedAttributes);
    return <div className="p-1">{attribute.values.map((item) => {
      const token = `${attribute.id}::${item.value}`;
      return <FilterCheckbox key={token} selected={selectedSet.has(token)} onChange={(selected) => updateMultiValue("attr", token, selected)}><span className="flex min-w-0 items-center gap-2 text-sm text-slate-700"><span className="truncate">{item.value}</span><span className="mr-auto text-[11px] text-slate-400">{item.count.toLocaleString("fa-IR")}</span></span></FilterCheckbox>;
    })}</div>;
  }

  const isFacetSheet = sheet !== null && sheet !== "list" && sheet !== "sort";

  return (
    <div className="lg:hidden">
      <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-2">
        <button type="button" onClick={() => setSheet("list")} className={chipClass(false)}><SlidersHorizontal size={14} />فیلتر</button>
        <button type="button" onClick={() => setSheet("sort")} className={chipClass(Boolean(currentSort))}><ArrowDownUp size={14} />{currentSortLabel ?? "مرتب‌سازی"}</button>
        {facetRows.map((row) => <button key={row.key} type="button" onClick={() => openFacet(row.key, false)} className={chipClass(row.active)}>{row.label}</button>)}
      </div>

      <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-2">
        <Link href={hrefToggle("inStock", inStock)} scroll={false} className={chipClass(Boolean(inStock))}>{inStock && <Check size={13} />}فقط کالاهای موجود</Link>
        <Link href={hrefToggle("hasDiscount", hasDiscount)} scroll={false} className={chipClass(Boolean(hasDiscount))}>{hasDiscount && <Check size={13} />}دارای تخفیف</Link>
        <Link href={hrefToggle("freeShipping", freeShipping)} scroll={false} className={chipClass(Boolean(freeShipping))}>{freeShipping && <Check size={13} />}ارسال رایگان</Link>
        <Link href={hrefToggle("sameDayDelivery", sameDayDelivery)} scroll={false} className={chipClass(Boolean(sameDayDelivery))}>{sameDayDelivery && <Check size={13} />}ارسال امروز</Link>
      </div>

      {appliedChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-2">
          {appliedChips.map((chip) => (
            <Link key={chip.key} href={chip.href} scroll={false} className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--brand-primary)] bg-[var(--brand-primary)]/8 px-3 py-1 text-[11px] font-bold text-[var(--brand-primary)]">{chip.label}<X size={12} /></Link>
          ))}
          <Link href={resetHref} scroll={false} className="text-[11px] font-bold text-[var(--muted)] underline">حذف همه</Link>
        </div>
      )}

      {/* Level 1: the full facet-name list opened by the "فیلتر" chip. */}
      <Modal.Backdrop isOpen={sheet === "list"} onOpenChange={(open) => { if (!open) closeSheet(); }} variant="blur">
        <Modal.Container placement="bottom" size="full">
          <Modal.Dialog aria-label="فیلترها" dir="rtl" className="mx-0 flex max-h-[88dvh] w-full max-w-none flex-col rounded-b-none rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <Modal.Header className="flex-row items-center border-b border-[var(--border)] px-4 py-3">
              <Modal.Heading className="text-base font-bold text-[var(--foreground)]">فیلترها</Modal.Heading>
              <div className="mr-auto flex items-center gap-3">
                {appliedChips.length > 0 && <Link href={resetHref} scroll={false} onClick={closeSheet} className="text-[11px] font-bold text-[var(--brand-primary)]">حذف فیلترها</Link>}
                <Modal.CloseTrigger aria-label="بستن فیلترها" className="grid size-8 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"><X size={18} /></Modal.CloseTrigger>
              </div>
            </Modal.Header>
            <Modal.Body className="overflow-y-auto p-0">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <span className="text-sm font-bold text-[var(--foreground)]">ارسال سریع</span>
                <Link href={hrefToggle("sameDayDelivery", sameDayDelivery)} scroll={false} className={`grid size-6 place-items-center rounded-full border ${sameDayDelivery ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "border-slate-300"}`}>{sameDayDelivery && <Check size={13} />}</Link>
              </div>
              <ul className="m-0 list-none p-0">
                {facetRows.map((row) => (
                  <li key={row.key}>
                    <button type="button" onClick={() => openFacet(row.key, true)} className="flex min-h-12 w-full items-center justify-between border-b border-[var(--border)] px-4 text-sm">
                      <span className={row.active ? "font-bold text-[var(--brand-primary)]" : "text-[var(--foreground)]"}>{row.label}</span>
                      <ChevronLeft size={17} className="shrink-0 text-[var(--muted)]" />
                    </button>
                  </li>
                ))}
              </ul>
            </Modal.Body>
            <Modal.Footer className="flex items-center gap-3 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              {appliedChips.length > 0 && <Link href={resetHref} scroll={false} onClick={closeSheet} className="text-xs font-bold text-[var(--muted)] underline">حذف فیلتر</Link>}
              <button type="button" onClick={closeSheet} className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-sm font-bold text-[var(--brand-primary-foreground)]">مشاهده نتایج</button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Level 2: a single facet's own controls — opened directly from the chip row, or drilled
          into from the level-1 list above (back arrow instead of a close button in that case). */}
      <Modal.Backdrop isOpen={isFacetSheet} onOpenChange={(open) => { if (!open) closeSheet(); }} variant="blur">
        <Modal.Container placement="bottom" size="full">
          <Modal.Dialog aria-label={facetTitle} dir="rtl" className="mx-0 flex max-h-[88dvh] w-full max-w-none flex-col rounded-b-none rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <Modal.Header className="flex-row items-center gap-3 border-b border-[var(--border)] px-4 py-3">
              {cameFromList
                ? <button type="button" aria-label="بازگشت به فیلترها" onClick={() => setSheet("list")} className="grid size-8 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"><ArrowRight size={19} /></button>
                : null}
              <Modal.Heading className="text-base font-bold text-[var(--foreground)]">{facetTitle}</Modal.Heading>
              <Modal.CloseTrigger aria-label="بستن" className="mr-auto grid size-8 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"><X size={18} /></Modal.CloseTrigger>
            </Modal.Header>
            <Modal.Body className="relative overflow-y-auto p-4">
              {isPending && <span className="sticky top-0 z-10 float-left grid size-7 place-items-center rounded-full bg-white shadow-sm" aria-label="در حال بروزرسانی نتایج"><Spinner size="sm" color="current" /></span>}
              {isFacetSheet && renderFacetBody(sheet as FacetKey)}
            </Modal.Body>
            <Modal.Footer className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <button type="button" onClick={closeSheet} className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--brand-primary)] text-sm font-bold text-[var(--brand-primary-foreground)]">مشاهده نتایج</button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Sort has no facet row of its own — it's a separate chip next to "فیلتر" on Digikala too. */}
      <Modal.Backdrop isOpen={sheet === "sort"} onOpenChange={(open) => { if (!open) closeSheet(); }} variant="blur">
        <Modal.Container placement="bottom" size="full">
          <Modal.Dialog aria-label="مرتب‌سازی محصولات" dir="rtl" className="mx-0 w-full max-w-none rounded-b-none rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <Modal.Header className="flex-row items-center border-b border-[var(--border)] px-4 py-3">
              <Modal.Heading className="text-base font-bold text-[var(--foreground)]">مرتب‌سازی</Modal.Heading>
              <Modal.CloseTrigger aria-label="بستن" className="mr-auto grid size-8 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"><X size={18} /></Modal.CloseTrigger>
            </Modal.Header>
            <Modal.Body className="p-2">
              <ul className="m-0 list-none p-0">
                {sortOptions.map((option) => (
                  <li key={option.id}>
                    <Link href={hrefSort(option.id)} scroll={false} onClick={closeSheet} className="flex min-h-12 items-center justify-between px-3 text-sm">
                      <span className={currentSort === option.id ? "font-bold text-[var(--brand-primary)]" : "text-[var(--foreground)]"}>{option.label}</span>
                      {currentSort === option.id && <Check size={17} className="text-[var(--brand-primary)]" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
