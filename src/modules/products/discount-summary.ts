import { isProductDiscountActive, type DiscountType } from "@/modules/products/discount";
import { optionEntries } from "@/modules/products/options";

type DiscountFields = {
  discountType: DiscountType | null;
  discountValue: number | string | { toString(): string } | null;
  discountStartsAt: Date | string | null;
  discountEndsAt: Date | string | null;
};

export type DiscountEntry = {
  /** Where it applies: the whole product, or one combination of its variants. */
  scope: "product" | "variant";
  /** "کل محصول", or the combination's values — «مشکی، XL». */
  label: string;
  type: DiscountType;
  value: number;
  startsAt: Date | null;
  endsAt: Date | null;
};

export type DiscountSummary = { active: DiscountEntry[]; upcoming: DiscountEntry[] };

/** A combination named by its values only — «مشکی، XL» — from its stored `{ "رنگ": "مشکی", "سایز": "XL" }` snapshot. */
export function combinationLabel(selection: unknown): string {
  const values = optionEntries(selection).map(([, value]) => value);
  return values.length ? values.join("، ") : "ترکیب";
}

function classify(source: DiscountFields, now: Date): "active" | "upcoming" | null {
  const value = Number(source.discountValue?.toString() ?? 0);
  if (!source.discountType || !(value > 0)) return null;
  if (isProductDiscountActive(source, now)) return "active";
  // A window that has not opened yet is worth showing; one that has already closed is not.
  const startsAt = source.discountStartsAt ? new Date(source.discountStartsAt) : null;
  return startsAt && source.discountEndsAt && startsAt > now ? "upcoming" : null;
}

function toEntry(source: DiscountFields, scope: DiscountEntry["scope"], label: string): DiscountEntry {
  return {
    scope,
    label,
    type: source.discountType as DiscountType,
    value: Number(source.discountValue?.toString() ?? 0),
    startsAt: source.discountStartsAt ? new Date(source.discountStartsAt) : null,
    endsAt: source.discountEndsAt ? new Date(source.discountEndsAt) : null,
  };
}

/**
 * Every discount a product carries, split into those running now and those scheduled to start.
 *
 * A product with combinations is priced by them alone — each one either has a discount of its own
 * or has none — so the product's own discount is not counted at all once it has any; only a
 * product without combinations reports its own. A combination that is switched off is not for
 * sale, so its discount is left out.
 */
export function summarizeDiscounts(
  product: DiscountFields & { variants: Array<DiscountFields & { selection: unknown; isActive: boolean }> },
  now = new Date(),
): DiscountSummary {
  const summary: DiscountSummary = { active: [], upcoming: [] };
  const own = product.variants.length > 0 ? null : classify(product, now);
  if (own) summary[own].push(toEntry(product, "product", "کل محصول"));
  for (const variant of product.variants) {
    if (!variant.isActive) continue;
    const state = classify(variant, now);
    if (state) summary[state].push(toEntry(variant, "variant", combinationLabel(variant.selection)));
  }
  return summary;
}
