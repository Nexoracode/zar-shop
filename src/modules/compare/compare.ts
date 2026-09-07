/*
 * Product comparison, client-side and guest-friendly: the shopper's picks live in localStorage,
 * not the database, the same way most storefronts (Digikala included) do it. These helpers are
 * pure so the provider, the tray and the compare page all agree on the rules.
 */

/** How many products fit side by side before the table stops being readable. */
export const COMPARE_MAX = 4;

/** The localStorage key the provider reads and writes. */
export const COMPARE_STORAGE_KEY = "zar:compare";

/** The snapshot kept for each picked product — enough to draw the tray without a request. */
export type CompareItem = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  categoryId: string | null;
  categoryName: string | null;
};

export type CompareRejectReason = "full" | "category" | "duplicate";
export type CompareAddResult = { ok: true } | { ok: false; reason: CompareRejectReason };

function sameCategory(list: CompareItem[], item: CompareItem) {
  const anchor = list.find((entry) => entry.categoryId)?.categoryId ?? null;
  // A product with no category can only ever sit alone; two of them are not comparable either.
  if (!anchor || !item.categoryId) return list.length === 0;
  return anchor === item.categoryId;
}

/** Whether `item` may join `list` right now, and if not, why. */
export function canAddToCompare(list: CompareItem[], item: CompareItem): CompareAddResult {
  if (list.some((entry) => entry.id === item.id)) return { ok: false, reason: "duplicate" };
  if (list.length >= COMPARE_MAX) return { ok: false, reason: "full" };
  if (!sameCategory(list, item)) return { ok: false, reason: "category" };
  return { ok: true };
}

const reasonMessages: Record<CompareRejectReason, string> = {
  full: `حداکثر ${COMPARE_MAX.toLocaleString("fa-IR")} کالا هم‌زمان قابل مقایسه است.`,
  category: "فقط کالاهای یک دسته‌بندی را می‌توان با هم مقایسه کرد.",
  duplicate: "این کالا از قبل در فهرست مقایسه است.",
};

export function compareRejectionMessage(reason: CompareRejectReason) {
  return reasonMessages[reason];
}

/** Reads the stored list, dropping anything that no longer matches the current shape. */
export function readCompareStorage(raw: string | null): CompareItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is CompareItem =>
        Boolean(entry) && typeof entry === "object"
        && typeof entry.id === "string"
        && typeof entry.slug === "string"
        && typeof entry.name === "string")
      .map((entry) => ({
        id: entry.id,
        slug: entry.slug,
        name: entry.name,
        image: typeof entry.image === "string" ? entry.image : null,
        categoryId: typeof entry.categoryId === "string" ? entry.categoryId : null,
        categoryName: typeof entry.categoryName === "string" ? entry.categoryName : null,
      }))
      .slice(0, COMPARE_MAX);
  } catch {
    return [];
  }
}
