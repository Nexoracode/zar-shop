"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Accordion, Checkbox, Slider, Spinner } from "@heroui/react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

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
  resetHref: string;
};

function FilterCheckbox({ selected, onChange, children }: { selected: boolean; onChange: (selected: boolean) => void; children: ReactNode }) {
  return <Checkbox isSelected={selected} onChange={onChange} className="w-full bg-transparent hover:bg-transparent data-[hovered=true]:bg-transparent">
    <Checkbox.Content className="flex min-h-9 w-full cursor-pointer items-center gap-2.5 bg-transparent py-2 text-right hover:bg-transparent data-[hovered=true]:bg-transparent">
      <Checkbox.Control className="size-[17px] shrink-0 rounded-[5px] border border-slate-300 bg-white text-white data-[selected]:border-[var(--brand-primary)] data-[selected]:bg-[var(--brand-primary)]">
        <Checkbox.Indicator className="grid size-full place-items-center p-0.5" />
      </Checkbox.Control>
      <span className="min-w-0 flex-1">{children}</span>
    </Checkbox.Content>
  </Checkbox>;
}

function normalizeSliderValue(value: number | number[]) {
  return Array.isArray(value) ? [value[0] ?? 0, value[1] ?? value[0] ?? 0] as [number, number] : [value, value] as [number, number];
}

function greatestCommonDivisor(left: number, right: number): number {
  return right === 0 ? Math.abs(left) : greatestCommonDivisor(right, left % right);
}

export function StorefrontCatalogFilters({ facets, selectedColors, selectedAttributes, minPrice, maxPrice, inStock, resetHref }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const selectedColorSet = new Set(selectedColors);
  const selectedAttributeSet = new Set(selectedAttributes);
  const priceBounds = facets.priceRange ?? { min: 0, max: 1 };
  const resolvedMinPrice = Math.min(Math.max(minPrice ?? priceBounds.min, priceBounds.min), priceBounds.max);
  const resolvedMaxPrice = Math.max(Math.min(maxPrice ?? priceBounds.max, priceBounds.max), priceBounds.min);
  const [priceValues, setPriceValues] = useState<[number, number]>([resolvedMinPrice, resolvedMaxPrice]);
  const activeCount = selectedColors.length + selectedAttributes.length + Number(minPrice !== undefined) + Number(maxPrice !== undefined) + Number(Boolean(inStock));
  const priceStep = Math.max(1, greatestCommonDivisor(priceBounds.max - priceBounds.min, 1_000_000));

  function navigate(next: URLSearchParams) {
    next.delete("page");
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  function updateMultiValue(name: "color" | "attr", value: string, selected: boolean) {
    const next = new URLSearchParams(searchParams.toString());
    const values = next.getAll(name).filter((item) => item !== value);
    if (selected) values.push(value);
    next.delete(name);
    for (const item of values) next.append(name, item);
    navigate(next);
  }

  function updateStock(selected: boolean) {
    const next = new URLSearchParams(searchParams.toString());
    if (selected) next.set("inStock", "1"); else next.delete("inStock");
    navigate(next);
  }

  function updatePrice(value: number | number[]) {
    const [nextMin, nextMax] = normalizeSliderValue(value);
    const next = new URLSearchParams(searchParams.toString());
    if (nextMin <= priceBounds.min) next.delete("MinPrice"); else next.set("MinPrice", Math.round(nextMin).toString());
    if (nextMax >= priceBounds.max) next.delete("MaxPrice"); else next.set("MaxPrice", Math.round(nextMax).toString());
    navigate(next);
  }

  return <div className={`storefront-mega-scroll relative rounded-xl border border-slate-200 bg-white px-4 py-5 transition-opacity lg:max-h-[calc(100dvh-var(--storefront-sticky-offset,112px)-16px)] lg:overflow-y-auto ${isPending ? "opacity-65" : "opacity-100"}`} dir="rtl" aria-busy={isPending}>
    {isPending && <span className="sticky top-0 z-10 float-left grid size-7 place-items-center rounded-full bg-white shadow-sm" aria-label="در حال بروزرسانی نتایج"><Spinner size="sm" color="current" /></span>}
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
      <h2 className="m-0 flex items-center gap-2 text-base font-black text-slate-900"><SlidersHorizontal size={18} />فیلترها</h2>
      {activeCount > 0 && <Link href={resetHref} scroll={false} className="text-[11px] font-bold text-[var(--brand-primary)]">حذف فیلترها</Link>}
    </div>

    {facets.priceRange && <section className="border-b border-slate-100 py-5" aria-labelledby="price-filter-title">
      <h3 id="price-filter-title" className="mb-4 text-sm font-bold text-slate-800">محدوده قیمت</h3>
      <div className="mb-5 flex items-center justify-between gap-3 text-[11px] text-slate-500">
        <span>از <strong className="text-xs text-slate-800">{priceValues[0].toLocaleString("fa-IR")}</strong> تومان</span>
        <span>تا <strong className="text-xs text-slate-800">{priceValues[1].toLocaleString("fa-IR")}</strong> تومان</span>
      </div>
      <Slider aria-label="محدوده قیمت" minValue={priceBounds.min} maxValue={priceBounds.max} step={priceStep} value={priceValues} onChange={(value) => setPriceValues(normalizeSliderValue(value))} onChangeEnd={updatePrice} className="w-full" dir="ltr">
        <Slider.Track className="relative h-6 w-full">
          <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200" />
          <Slider.Fill className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--brand-primary)]" />
          <Slider.Thumb index={0} aria-label="حداقل قیمت" className="top-1/2 size-5 -translate-y-1/2 rounded-full border-[5px] border-[var(--brand-primary)] bg-white shadow-sm outline-none ring-white focus-visible:ring-2" />
          <Slider.Thumb index={1} aria-label="حداکثر قیمت" className="top-1/2 size-5 -translate-y-1/2 rounded-full border-[5px] border-[var(--brand-primary)] bg-white shadow-sm outline-none ring-white focus-visible:ring-2" />
        </Slider.Track>
      </Slider>
    </section>}

    <div className="border-b border-slate-100 py-3">
      <FilterCheckbox selected={Boolean(inStock)} onChange={updateStock}><span className="block text-xs font-bold text-slate-700">فقط کالاهای موجود</span></FilterCheckbox>
    </div>

    <Accordion dir="rtl" variant="surface" hideSeparator className="w-full bg-transparent p-0 text-right" aria-label="فیلترهای محصولات">
      {facets.colors.length > 0 && <Accordion.Item id="catalog-colors" className="border-b border-slate-100 bg-transparent">
        <Accordion.Heading><Accordion.Trigger className="flex w-full items-center justify-between bg-transparent py-4 text-right text-sm font-bold text-slate-800 hover:bg-transparent data-[hovered=true]:bg-transparent">رنگ<Accordion.Indicator><ChevronDown size={16} /></Accordion.Indicator></Accordion.Trigger></Accordion.Heading>
        <Accordion.Panel><Accordion.Body className="max-h-52 overflow-y-auto pb-4">
          {facets.colors.map((color) => <FilterCheckbox key={color.id} selected={selectedColorSet.has(color.id)} onChange={(selected) => updateMultiValue("color", color.id, selected)}><span className="flex min-w-0 items-center gap-2 text-xs text-slate-700"><span className="size-4 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} /><span className="truncate">{color.name}</span><span className="mr-auto text-[10px] text-slate-400">{color.count.toLocaleString("fa-IR")}</span></span></FilterCheckbox>)}
        </Accordion.Body></Accordion.Panel>
      </Accordion.Item>}
      {facets.attributes.map((attribute) => <Accordion.Item key={attribute.id} id={`catalog-attribute-${attribute.id}`} className="border-b border-slate-100 bg-transparent">
        <Accordion.Heading><Accordion.Trigger className="flex w-full items-center justify-between bg-transparent py-4 text-right text-sm font-bold text-slate-800 hover:bg-transparent data-[hovered=true]:bg-transparent">{attribute.name}<Accordion.Indicator><ChevronDown size={16} /></Accordion.Indicator></Accordion.Trigger></Accordion.Heading>
        <Accordion.Panel><Accordion.Body className="max-h-52 overflow-y-auto pb-4">
          {attribute.values.map((item) => {
            const token = `${attribute.id}::${item.value}`;
            return <FilterCheckbox key={token} selected={selectedAttributeSet.has(token)} onChange={(selected) => updateMultiValue("attr", token, selected)}><span className="flex min-w-0 items-center gap-2 text-xs text-slate-700"><span className="truncate">{item.value}</span><span className="mr-auto text-[10px] text-slate-400">{item.count.toLocaleString("fa-IR")}</span></span></FilterCheckbox>;
          })}
        </Accordion.Body></Accordion.Panel>
      </Accordion.Item>)}
    </Accordion>
  </div>;
}
