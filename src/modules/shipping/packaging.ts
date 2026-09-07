import type { PackagingBox } from "@generated/prisma/client";

/*
 * Box selection, deliberately free of any Prisma or network import so it can be unit tested and
 * called from either side of the app — the same shape as `parcel.ts` and `zone-rates.ts`.
 */

/**
 * The smallest box that still fits a parcel of this content weight.
 *
 * 1. only `isActive` boxes are considered
 * 2. of those, the ones whose `maxWeightGrams` covers the contents
 * 3. among the survivors, the tightest fit (lowest `maxWeightGrams`)
 * 4. if nothing fits, the box flagged `isDefault`
 * 5. if there is no default either, `null`
 */
export function selectBox(contentWeightGrams: number, boxes: PackagingBox[]): PackagingBox | null {
  const active = boxes.filter((box) => box.isActive);
  const fitting = active
    .filter((box) => box.maxWeightGrams >= contentWeightGrams)
    .sort((a, b) => a.maxWeightGrams - b.maxWeightGrams);
  if (fitting.length > 0) return fitting[0];
  return active.find((box) => box.isDefault) ?? null;
}
