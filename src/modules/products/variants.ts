import { createHash } from "node:crypto";
import { selectionSignature, type VariantSelection } from "@/modules/products/variant-combinations";

export * from "@/modules/products/variant-combinations";

/*
 * The database side of a combination: the key that names it, and reading a stored row.
 *
 * The arithmetic the admin form shares lives in `variant-combinations.ts`; this module adds what
 * only the server may do, so importing it from a client component would be a mistake the bundler
 * catches rather than a hash quietly computed in two different ways.
 */

/**
 * The key that identifies a combination in the database.
 *
 * It hashes the same canonical shape the form signs with, so a pairing keeps one identity from
 * the picker through the cart to the order line, whatever order the types were added in.
 */
export function variantSelectionKey(selection: VariantSelection) {
  return createHash("sha256").update(selectionSignature(selection)).digest("hex");
}

/** The combination a cart line refers to, or null when the product no longer offers it. */
export function findVariant<T extends { selectionKey: string }>(variants: T[], selectionKey: string) {
  return variants.find((variant) => variant.selectionKey === selectionKey) ?? null;
}

/** A row as it comes back from the database, whose money columns arrive as `Decimal`. */
type StoredVariant = {
  selectionKey: string;
  selection: unknown;
  price: { toString(): string } | null;
  weightGrams: { toString(): string } | null;
  discountType: "PERCENT" | "FIXED" | null;
  discountValue: { toString(): string } | null;
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
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
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
}) {
  return {
    weightGrams: (variant?.weightGrams ?? product.weightGrams).toString(),
    fixedPrice: variant?.price != null ? Number(variant.price) : product.fixedPrice != null ? Number(product.fixedPrice) : null,
    discountType: variant?.discountType ?? product.discountType,
    discountValue: variant?.discountValue ?? product.discountValue,
    // A combination's own window travels with its own type/value; one with neither reads the
    // product's, exactly like the amount already does.
    discountStartsAt: variant?.discountStartsAt ?? product.discountStartsAt,
    discountEndsAt: variant?.discountEndsAt ?? product.discountEndsAt,
  };
}

/** The cheapest sellable combination, for a catalogue card that shows "from …". */
export function lowestVariantPrice(variants: StoredVariant[]) {
  const prices = variants.filter((variant) => variant.isActive && variant.price != null).map((variant) => Number(variant.price));
  return prices.length ? Math.min(...prices) : null;
}
