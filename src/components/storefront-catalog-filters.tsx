"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Accordion, Button, Checkbox } from "@heroui/react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { HeroNumberInput } from "@/components/hero-number-input";

type Facets = {
  colors: Array<{ id: string; name: string; hex: string; count: number }>;
  attributes: Array<{ id: string; name: string; values: Array<{ value: string; count: number }> }>;
  priceRange: { min: number; max: number } | null;
};

type Props = {
  facets: Facets;
  selectedColors: string[];
  selectedAttributes: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  hidden: { q?: string; category?: string; sortby: string };
  resetHref: string;
};

function FilterCheckbox({ name, value, selected, children }: { name: string; value: string; selected: boolean; children: ReactNode }) {
  return <Checkbox name={name} value={value} defaultSelected={selected} className="w-full">
    <Checkbox.Content className="flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-1 text-right transition hover:bg-slate-50">
      <Checkbox.Control className="size-[18px] shrink-0 rounded-[5px] border border-slate-300 bg-white text-white data-[selected]:border-[var(--brand-primary)] data-[selected]:bg-[var(--brand-primary)]">
        <Checkbox.Indicator className="grid size-full place-items-center p-0.5" />
      </Checkbox.Control>
      <span className="min-w-0 flex-1">{children}</span>
    </Checkbox.Content>
  </Checkbox>;
}

export function StorefrontCatalogFilters({ facets, selectedColors, selectedAttributes, minPrice, maxPrice, inStock, hidden, resetHref }: Props) {
  const selectedColorSet = new Set(selectedColors);
  const selectedAttributeSet = new Set(selectedAttributes);
  const activeCount = selectedColors.length + selectedAttributes.length + Number(minPrice !== undefined) + Number(maxPrice !== undefined) + Number(Boolean(inStock));

  return <form action="/products" method="get" className="storefront-mega-scroll rounded-xl border border-slate-200 bg-white px-4 py-5 lg:max-h-[calc(100dvh-var(--storefront-sticky-offset,112px)-16px)] lg:overflow-y-auto" dir="rtl">
    {hidden.q && <input type="hidden" name="q" value={hidden.q} />}
    {hidden.category && <input type="hidden" name="category" value={hidden.category} />}
    <input type="hidden" name="sortby" value={hidden.sortby} />

    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
      <h2 className="m-0 flex items-center gap-2 text-base font-black text-slate-900"><SlidersHorizontal size={18} />فیلترها</h2>
      {activeCount > 0 && <Link href={resetHref} className="text-[11px] font-bold text-[var(--brand-primary)]">حذف فیلترها</Link>}
    </div>

    <section className="border-b border-slate-100 py-5" aria-labelledby="price-filter-title">
      <h3 id="price-filter-title" className="mb-4 text-sm font-bold text-slate-800">محدوده قیمت</h3>
      <div className="grid gap-3">
        <label className="grid gap-1.5 text-[10px] text-slate-400">از<HeroNumberInput name="MinPrice" defaultValue={minPrice} placeholder={facets.priceRange ? facets.priceRange.min.toLocaleString("fa-IR") : "حداقل"} suffix="تومان" className="h-10 min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs" /></label>
        <label className="grid gap-1.5 text-[10px] text-slate-400">تا<HeroNumberInput name="MaxPrice" defaultValue={maxPrice} placeholder={facets.priceRange ? facets.priceRange.max.toLocaleString("fa-IR") : "حداکثر"} suffix="تومان" className="h-10 min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs" /></label>
      </div>
    </section>

    <div className="border-b border-slate-100 py-3">
      <FilterCheckbox name="inStock" value="1" selected={Boolean(inStock)}><span className="block text-xs font-bold text-slate-700">فقط کالاهای موجود</span></FilterCheckbox>
    </div>

    <Accordion dir="rtl" variant="surface" hideSeparator className="w-full bg-transparent p-0 text-right" aria-label="فیلترهای محصولات">
      {facets.colors.length > 0 && <Accordion.Item id="catalog-colors" className="border-b border-slate-100">
        <Accordion.Heading><Accordion.Trigger className="flex w-full items-center justify-between py-4 text-right text-sm font-bold text-slate-800">رنگ<Accordion.Indicator><ChevronDown size={16} /></Accordion.Indicator></Accordion.Trigger></Accordion.Heading>
        <Accordion.Panel><Accordion.Body className="max-h-52 overflow-y-auto pb-4">
          {facets.colors.map((color) => <FilterCheckbox key={color.id} name="color" value={color.id} selected={selectedColorSet.has(color.id)}><span className="flex min-w-0 items-center gap-2 text-xs text-slate-700"><span className="size-4 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} /><span className="truncate">{color.name}</span><span className="mr-auto text-[10px] text-slate-400">{color.count.toLocaleString("fa-IR")}</span></span></FilterCheckbox>)}
        </Accordion.Body></Accordion.Panel>
      </Accordion.Item>}
      {facets.attributes.map((attribute) => <Accordion.Item key={attribute.id} id={`catalog-attribute-${attribute.id}`} className="border-b border-slate-100">
        <Accordion.Heading><Accordion.Trigger className="flex w-full items-center justify-between py-4 text-right text-sm font-bold text-slate-800">{attribute.name}<Accordion.Indicator><ChevronDown size={16} /></Accordion.Indicator></Accordion.Trigger></Accordion.Heading>
        <Accordion.Panel><Accordion.Body className="max-h-52 overflow-y-auto pb-4">
          {attribute.values.map((item) => {
            const token = `${attribute.id}::${item.value}`;
            return <FilterCheckbox key={token} name="attr" value={token} selected={selectedAttributeSet.has(token)}><span className="flex min-w-0 items-center gap-2 text-xs text-slate-700"><span className="truncate">{item.value}</span><span className="mr-auto text-[10px] text-slate-400">{item.count.toLocaleString("fa-IR")}</span></span></FilterCheckbox>;
          })}
        </Accordion.Body></Accordion.Panel>
      </Accordion.Item>)}
    </Accordion>

    <Button type="submit" variant="primary" className="mt-5 h-10 min-h-10 w-full rounded-lg bg-[var(--brand-primary)] text-xs font-normal text-[var(--brand-primary-foreground)]">اعمال فیلترها</Button>
  </form>;
}
