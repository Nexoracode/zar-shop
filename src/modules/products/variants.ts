import { createHash } from "node:crypto";
import { isDefaultSelection, selectionSignature, type VariantSelection } from "@/modules/products/variant-combinations";

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
  // A product without options has one default variant, and it is named by nothing: the same empty
  // key a cart line has always carried for "no selection", so no line needs translating.
  if (isDefaultSelection(selection)) return "";
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
  preparationDays: number;
  minOrderQuantity: number;
  maxOrderQuantity: number | null;
  isActive: boolean;
};

/**
 * The variant a customer chose, as a readable snapshot (null for the default variant, which is
 * named by nothing). Every product has at least one variant, so a product with none sellable is
 * simply not for sale.
 */
export function resolveVariantSelection(variants: StoredVariant[], selected: Record<string, string>, quantity = 1) {
  const selectionKey = variantSelectionKey(selected);
  const match = variants.find((variant) => variant.isActive && variant.selectionKey === selectionKey);
  if (!match) return { ok: false as const, reason: "unknown" as const };
  if (match.stock < quantity) return { ok: false as const, reason: "stock" as const };
  return { ok: true as const, selectionKey, snapshot: isDefaultSelection(match.selection) ? null : match.selection as Record<string, string> };
}

/** Whether a snapshot already in a cart still names a variant that can be bought. */
export function isVariantSnapshotValid(variants: StoredVariant[], selectionKey: string, quantity = 1) {
  const match = variants.find((variant) => variant.isActive && variant.selectionKey === selectionKey);
  return Boolean(match && match.stock >= quantity);
}

/** The most of a variant a cart line may hold: its stock, its own maximum and the store-wide cap, whichever is lowest. */
export function variantMaxQuantity(variant: { stock: number; maxOrderQuantity: number | null } | null, storeMaximum: number) {
  if (!variant) return 0;
  return Math.max(0, Math.min(storeMaximum, variant.maxOrderQuantity ?? storeMaximum, variant.stock));
}

/**
 * Whether a quantity is within what the variant allows, or the message to show when it is not.
 * A variant may narrow the store-wide cap but never widen it, so the effective ceiling is
 * whichever of the two is lower.
 */
export function variantQuantityError(quantity: number, variant: { minOrderQuantity: number; maxOrderQuantity: number | null } | null, storeMaximum: number) {
  const minimum = variant?.minOrderQuantity ?? 1;
  if (quantity < minimum) return `حداقل تعداد سفارش این کالا ${minimum.toLocaleString("fa-IR")} عدد است.`;
  const ceiling = Math.min(variant?.maxOrderQuantity ?? storeMaximum, storeMaximum);
  if (quantity > ceiling) return `حداکثر تعداد مجاز برای این کالا ${ceiling.toLocaleString("fa-IR")} عدد است.`;
  return null;
}

/**
 * The figures a line is priced from.
 *
 * A variant overrides the product's price and weight when it sets them. Discounts never
 * inherit — see below.
 */
export function variantPricing(variant: StoredVariant | null, product: {
  weightGrams: { toString(): string };
  fixedPrice: { toString(): string } | null;
  discountType: "PERCENT" | "FIXED" | null;
  discountValue: { toString(): string } | null;
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
}) {
  // A variant is the whole story on discounts: it either has one of its own — schedule included,
  // even when that schedule is "none", which is a فروش ویژه — or it has none. The product's
  // discount columns only mirror the display variant for listings, so they are read here only
  // when there is no variant at all to price from.
  const discountSource = variant ?? product;
  return {
    weightGrams: (variant?.weightGrams ?? product.weightGrams).toString(),
    fixedPrice: variant?.price != null ? Number(variant.price) : product.fixedPrice != null ? Number(product.fixedPrice) : null,
    discountType: discountSource.discountType,
    discountValue: discountSource.discountValue,
    discountStartsAt: discountSource.discountStartsAt,
    discountEndsAt: discountSource.discountEndsAt,
  };
}

/** The columns of a variant the product's mirror is built from. */
type MirrorVariant = {
  price: { toString(): string } | null;
  weightGrams: { toString(): string } | null;
  discountType: "PERCENT" | "FIXED" | null;
  discountValue: { toString(): string } | null;
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
  stock: number;
  preparationDays: number;
  minOrderQuantity: number;
  maxOrderQuantity: number | null;
  isActive: boolean;
};

/**
 * The variant a listing speaks for: among the ones that can be bought now, the cheapest (lowest
 * price, or lightest for gold); when none can, the cheapest active one; when none are active, the
 * first. Ties keep the order given, so the choice is stable between saves.
 */
export function pickDisplayVariant<T extends Pick<MirrorVariant, "price" | "weightGrams" | "stock" | "isActive">>(variants: T[]): T | null {
  if (!variants.length) return null;
  const pool = [variants.filter((variant) => variant.isActive && variant.stock > 0), variants.filter((variant) => variant.isActive)].find((group) => group.length) ?? variants;
  const cost = (variant: T) => Number((variant.price ?? variant.weightGrams)?.toString() ?? 0);
  return pool.reduce((best, variant) => (cost(variant) < cost(best) ? variant : best));
}

/**
 * The product's mirror columns (see the `Product` model), worked out from its variants: the total
 * stock of the sellable ones, and the display variant's price, weight, discount, preparation time
 * and order limits. Written to the product on every change so listings, filters and sorting can
 * stay on plain columns.
 */
export function productMirror(variants: MirrorVariant[]) {
  const display = pickDisplayVariant(variants);
  const sellable = variants.filter((variant) => variant.isActive);
  return {
    stock: sellable.reduce((sum, variant) => sum + Math.max(0, variant.stock), 0),
    preparationDays: sellable.length ? Math.min(...sellable.map((variant) => variant.preparationDays)) : display?.preparationDays ?? 2,
    // Gold prices come from weight and the day's rate, so its mirror holds no stored price; a
    // product's weight column cannot be empty, so it keeps its value when the variant has none.
    fixedPrice: display?.price != null ? display.price.toString() : null,
    ...(display?.weightGrams != null ? { weightGrams: display.weightGrams.toString() } : {}),
    discountType: display?.discountType ?? null,
    discountValue: display?.discountValue != null ? display.discountValue.toString() : null,
    discountStartsAt: display?.discountStartsAt ?? null,
    discountEndsAt: display?.discountEndsAt ?? null,
    minOrderQuantity: display?.minOrderQuantity ?? 1,
    maxOrderQuantity: display?.maxOrderQuantity ?? null,
  };
}

/** The cheapest sellable combination, for a catalogue card that shows "from …". */
export function lowestVariantPrice(variants: StoredVariant[]) {
  const prices = variants.filter((variant) => variant.isActive && variant.price != null).map((variant) => Number(variant.price));
  return prices.length ? Math.min(...prices) : null;
}
