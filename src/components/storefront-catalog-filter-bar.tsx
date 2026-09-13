"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Modal } from "@heroui/react";
import { ArrowDownUp, Check, SlidersHorizontal, X } from "lucide-react";
import { StorefrontCatalogFilters, type Facets } from "@/components/storefront-catalog-filters";

type SortOption = { id: string; label: string };
type BooleanFacetKey = "inStock" | "hasDiscount" | "freeShipping" | "sameDayDelivery";

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

// Digikala's own mobile product-list page (measured from the live site): below the header, a
// horizontally scrollable row of pill chips — one per filterable facet plus "فیلتر" (the full
// sheet) and sort — followed by a second row of instant on/off chips for the simple yes/no
// facets, and (once anything is selected) a row of removable chips summarizing the active
// filters. Each facet chip here opens the *same* filter sheet already built for the "فیلتر"
// button, just pre-expanded to that one facet's accordion section, rather than duplicating N
// near-identical single-facet popovers.
export function StorefrontCatalogFilterBar({ facets, categoryScoped, selectedBrands, selectedColors, selectedAttributes, minPrice, maxPrice, inStock, hasDiscount, freeShipping, sameDayDelivery, resetHref, sortOptions, currentSort }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sheet, setSheet] = useState<"filters" | "sort" | null>(null);
  const [focusKey, setFocusKey] = useState<string | undefined>(undefined);

  function openFilters(key?: string) {
    setFocusKey(key);
    setSheet("filters");
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

  const hasPriceRange = facets.priceRange !== null && facets.priceRange.min !== facets.priceRange.max;
  const priceActive = minPrice !== undefined || maxPrice !== undefined;
  const currentSortLabel = sortOptions.find((option) => option.id === currentSort)?.label;

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

  return (
    <div className="lg:hidden">
      <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-2">
        <button type="button" onClick={() => openFilters(undefined)} className={chipClass(false)}><SlidersHorizontal size={14} />فیلتر</button>
        <button type="button" onClick={() => setSheet("sort")} className={chipClass(Boolean(currentSort))}><ArrowDownUp size={14} />{currentSortLabel ?? "مرتب‌سازی"}</button>
        {hasPriceRange && <button type="button" onClick={() => openFilters("catalog-price")} className={chipClass(priceActive)}>محدوده قیمت</button>}
        {!categoryScoped && facets.brands.length > 0 && <button type="button" onClick={() => openFilters("catalog-brands")} className={chipClass(selectedBrands.length > 0)}>برند</button>}
        {categoryScoped && facets.colors.length > 0 && <button type="button" onClick={() => openFilters("catalog-colors")} className={chipClass(selectedColors.length > 0)}>رنگ</button>}
        {categoryScoped && facets.attributes.map((attribute) => (
          <button key={attribute.id} type="button" onClick={() => openFilters(`catalog-attribute-${attribute.id}`)} className={chipClass(selectedAttributes.some((token) => token.startsWith(`${attribute.id}::`)))}>{attribute.name}</button>
        ))}
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

      <Modal.Backdrop isOpen={sheet === "filters"} onOpenChange={(open) => { if (!open) setSheet(null); }} variant="blur">
        <Modal.Container placement="bottom" size="full">
          <Modal.Dialog aria-label="فیلتر محصولات" dir="rtl" className="mx-0 flex max-h-[88dvh] w-full max-w-none flex-col rounded-b-none rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <Modal.Header className="flex-row items-center border-b border-[var(--border)] px-4 py-3">
              <Modal.Heading className="text-base font-bold text-[var(--foreground)]">فیلترها</Modal.Heading>
              <div className="mr-auto flex items-center gap-3">
                {appliedChips.length > 0 && <Link href={resetHref} scroll={false} onClick={() => setSheet(null)} className="text-[11px] font-bold text-[var(--brand-primary)]">حذف فیلترها</Link>}
                <Modal.CloseTrigger aria-label="بستن فیلترها" className="grid size-8 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"><X size={18} /></Modal.CloseTrigger>
              </div>
            </Modal.Header>
            <Modal.Body className="overflow-y-auto p-4">
              <StorefrontCatalogFilters
                key={focusKey ?? "default"}
                embedded
                focusKey={focusKey}
                facets={facets}
                categoryScoped={categoryScoped}
                selectedBrands={selectedBrands}
                selectedColors={selectedColors}
                selectedAttributes={selectedAttributes}
                minPrice={minPrice}
                maxPrice={maxPrice}
                inStock={inStock}
                hasDiscount={hasDiscount}
                freeShipping={freeShipping}
                sameDayDelivery={sameDayDelivery}
                resetHref={resetHref}
              />
            </Modal.Body>
            <Modal.Footer className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <button type="button" onClick={() => setSheet(null)} className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--brand-primary)] text-sm font-bold text-[var(--brand-primary-foreground)]">مشاهده نتایج</button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <Modal.Backdrop isOpen={sheet === "sort"} onOpenChange={(open) => { if (!open) setSheet(null); }} variant="blur">
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
                    <Link href={hrefSort(option.id)} scroll={false} onClick={() => setSheet(null)} className="flex min-h-12 items-center justify-between px-3 text-sm">
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
