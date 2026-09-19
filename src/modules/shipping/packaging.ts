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

/**
 * The box every store always has. It is created by the migration (and the development seed), and
 * `ensureDefaultPackagingBox` recreates it if a database ever ends up without one, so a parcel
 * always has a box to go in whatever the admin does to the rest.
 */
/** Fixed so that two requests restoring it at once collide on the key instead of making two boxes. */
export const STANDARD_PACKAGING_BOX_ID = "default-packaging-box";

export const STANDARD_PACKAGING_BOX = {
  name: "بسته‌بندی استاندارد",
  lengthCm: 30,
  widthCm: 20,
  heightCm: 15,
  weightGrams: 150,
  maxWeightGrams: 5000,
  tapinBoxId: null,
  isDefault: true,
  isActive: true,
  sortOrder: 0,
} as const;

/** Why a change to a box would leave the store without a usable default, or null when it would not. */
export function defaultBoxChangeBlocker(existing: { isDefault: boolean }, next: { isDefault: boolean; isActive: boolean }): string | null {
  if (!existing.isDefault) return null;
  if (!next.isDefault) return "فروشگاه همیشه باید یک جعبه پیش‌فرض داشته باشد؛ ابتدا جعبه دیگری را پیش‌فرض کنید.";
  if (!next.isActive) return "جعبه پیش‌فرض باید فعال بماند؛ ابتدا جعبه دیگری را پیش‌فرض کنید.";
  return null;
}
