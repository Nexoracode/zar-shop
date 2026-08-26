import { createHash } from "node:crypto";

/*
 * Combination arithmetic for product variants.
 *
 * A product varies by one or more types (رنگ, سایز); every pairing of their chosen values is a
 * combination the customer can buy, and each carries its own price, discount and stock. This
 * module owns the shape of those combinations and nothing else — no Prisma, no network — so the
 * rules can be read and tested on their own.
 */

export type VariantSelection = Record<string, string>;

export type VariantDraft = {
  selectionKey: string;
  selection: VariantSelection;
  /** General shops set a price; gold shops set a weight and the day's rate does the rest. */
  price: string | null;
  weightGrams: string | null;
  discountType: "PERCENT" | "FIXED" | null;
  discountValue: string | null;
  stock: number;
  isActive: boolean;
};

/** One type on the product, with the values it offers, in the order they should be shown. */
export type SelectedType = { typeName: string; values: string[] };

/** A product with more combinations than this is unmanageable in a form and slow to price. */
export const MAX_VARIANTS = 100;

/**
 * The key that identifies a combination.
 *
 * Sorted by type name before hashing, so the same pairing produces the same key no matter what
 * order the types were added in — the cart stores this key and has to keep matching after the
 * admin reorders anything.
 */
export function variantSelectionKey(selection: VariantSelection) {
  const ordered = Object.keys(selection).sort().map((key) => [key, selection[key]]);
  return createHash("sha256").update(JSON.stringify(ordered)).digest("hex");
}

/**
 * Every pairing of the chosen values, in a stable order.
 *
 * A type with no values contributes nothing to buy, so the result is empty rather than silently
 * dropping that type and offering combinations the shop never described.
 */
export function buildCombinations(types: SelectedType[]): VariantSelection[] {
  const usable = types.filter((type) => type.typeName.trim());
  if (!usable.length) return [];
  if (usable.some((type) => type.values.length === 0)) return [];

  return usable.reduce<VariantSelection[]>((rows, type) => {
    return rows.flatMap((row) => type.values.map((value) => ({ ...row, [type.typeName]: value })));
  }, [{}]);
}

function emptyDraft(selection: VariantSelection): VariantDraft {
  return {
    selectionKey: variantSelectionKey(selection),
    selection,
    price: null,
    weightGrams: null,
    discountType: null,
    discountValue: null,
    stock: 0,
    isActive: true,
  };
}

/**
 * The combination rows for a set of types, keeping what has already been filled in.
 *
 * Adding a fourth colour must not blank the prices on the three that were already priced, and
 * removing a size must take only its own rows. Rows are matched by `selectionKey`, so a pairing
 * survives anything that does not change which values it is made of.
 */
export function mergeCombinations(existing: VariantDraft[], types: SelectedType[]): VariantDraft[] {
  const byKey = new Map(existing.map((variant) => [variant.selectionKey, variant]));
  return buildCombinations(types)
    .slice(0, MAX_VARIANTS)
    .map((selection) => {
      const key = variantSelectionKey(selection);
      const kept = byKey.get(key);
      // The selection is rewritten from the current types so a renamed type reaches its rows.
      return kept ? { ...kept, selection } : emptyDraft(selection);
    });
}

/** How a combination reads in a list: «مشکی، XL», in the types' own order. */
export function describeSelection(selection: VariantSelection, order: string[] = []) {
  const names = order.length ? order.filter((name) => name in selection) : Object.keys(selection);
  return names.map((name) => selection[name]).join("، ");
}

/** Whether a combination can be bought right now, at this quantity. */
export function isVariantAvailable(variant: Pick<VariantDraft, "isActive" | "stock">, quantity = 1) {
  return variant.isActive && variant.stock >= quantity;
}

/** The combination a cart line refers to, or null when the product no longer offers it. */
export function findVariant<T extends { selectionKey: string }>(variants: T[], selectionKey: string) {
  return variants.find((variant) => variant.selectionKey === selectionKey) ?? null;
}

/*
 * The rest of the app talks to a combination through these. Everything above is arithmetic on
 * drafts; everything below reads a stored row, whose money columns arrive as `Decimal`.
 */

type StoredVariant = {
  selectionKey: string;
  selection: unknown;
  price: { toString(): string } | null;
  weightGrams: { toString(): string } | null;
  discountType: "PERCENT" | "FIXED" | null;
  discountValue: { toString(): string } | null;
  stock: number;
  isActive: boolean;
};

/** The selection a customer made, as a readable snapshot, or null when the product has no variants. */
export function resolveVariantSelection(variants: StoredVariant[], selected: Record<string, string>, quantity = 1) {
  const sellable = variants.filter((variant) => variant.isActive);
  if (!sellable.length) return { ok: true as const, selectionKey: "", snapshot: null };

  const selectionKey = variantSelectionKey(selected);
  const match = sellable.find((variant) => variant.selectionKey === selectionKey);
  if (!match) return { ok: false as const, reason: "unknown" as const };
  if (match.stock < quantity) return { ok: false as const, reason: "stock" as const };
  return { ok: true as const, selectionKey, snapshot: match.selection as Record<string, string> };
}

/** Whether a snapshot already in a cart still names a combination that can be bought. */
export function isVariantSnapshotValid(variants: StoredVariant[], selectionKey: string, quantity = 1) {
  const sellable = variants.filter((variant) => variant.isActive);
  if (!sellable.length) return selectionKey === "";
  const match = sellable.find((variant) => variant.selectionKey === selectionKey);
  return Boolean(match && match.stock >= quantity);
}

/**
 * The figures a line is priced from.
 *
 * A combination overrides the product on any field it sets and inherits the rest, so a shop can
 * price one colour differently without restating everything else about the product.
 */
export function variantPricing(variant: StoredVariant | null, product: {
  weightGrams: { toString(): string };
  fixedPrice: { toString(): string } | null;
  discountType: "PERCENT" | "FIXED" | null;
  discountValue: { toString(): string } | null;
}) {
  return {
    weightGrams: (variant?.weightGrams ?? product.weightGrams).toString(),
    fixedPrice: variant?.price != null ? Number(variant.price) : product.fixedPrice != null ? Number(product.fixedPrice) : null,
    discountType: variant?.discountType ?? product.discountType,
    discountValue: variant?.discountValue ?? product.discountValue,
  };
}

/** The cheapest sellable combination, for a catalogue card that shows "from …". */
export function lowestVariantPrice(variants: StoredVariant[]) {
  const prices = variants.filter((variant) => variant.isActive && variant.price != null).map((variant) => Number(variant.price));
  return prices.length ? Math.min(...prices) : null;
}
