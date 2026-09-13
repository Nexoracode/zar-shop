"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function normalizeSliderValue(value: number | number[]): [number, number] {
  if (!Array.isArray(value)) return [value, value] as [number, number];
  const first = value[0] ?? 0;
  const second = value[1] ?? first;
  return first <= second ? [first, second] : [second, first];
}

export function greatestCommonDivisor(left: number, right: number): number {
  return right === 0 ? Math.abs(left) : greatestCommonDivisor(right, left % right);
}

// Shared by StorefrontCatalogFilters (desktop sidebar + the mobile "همه فیلترها" sheet) and
// StorefrontCatalogFilterBar (the mobile per-facet drill-down sheets): both mutate the same
// /products query-string facets and both want the same snappy client-side transition instead of
// a full page navigation, so the update logic lives in one place rather than two copies drifting
// apart.
export function useCatalogFilterActions() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function navigate(next: URLSearchParams) {
    next.delete("page");
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  function updateMultiValue(name: "brand" | "color" | "attr", value: string, selected: boolean) {
    const next = new URLSearchParams(searchParams.toString());
    const values = next.getAll(name).filter((item) => item !== value);
    if (selected) values.push(value);
    next.delete(name);
    for (const item of values) next.append(name, item);
    navigate(next);
  }

  function updateBooleanValue(name: "inStock" | "hasDiscount" | "freeShipping" | "sameDayDelivery", selected: boolean) {
    const next = new URLSearchParams(searchParams.toString());
    if (selected) next.set(name, "1"); else next.delete(name);
    navigate(next);
  }

  function updatePrice(bounds: { min: number; max: number }, value: number | number[]) {
    const [nextMin, nextMax] = normalizeSliderValue(value);
    const next = new URLSearchParams(searchParams.toString());
    if (nextMin <= bounds.min) next.delete("MinPrice"); else next.set("MinPrice", Math.round(nextMin).toString());
    if (nextMax >= bounds.max) next.delete("MaxPrice"); else next.set("MaxPrice", Math.round(nextMax).toString());
    navigate(next);
  }

  function resetAll(resetHref: string) {
    startTransition(() => router.replace(resetHref, { scroll: false }));
  }

  return { isPending, updateMultiValue, updateBooleanValue, updatePrice, resetAll };
}
