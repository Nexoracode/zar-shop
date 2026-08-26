import { Prisma } from "@generated/prisma/client";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { calculateProductPrice } from "@/modules/products/pricing";
import { findVariant, variantPricing } from "@/modules/products/variants";

/*
 * What one line of a cart or an order costs.
 *
 * The cart, the checkout preview, the checkout itself and the shipping quote all had their own
 * copy of this, which meant four places to keep in step every time pricing changed. It lives
 * here once, and a variant's overrides are applied in one place rather than four.
 */

type PricedProduct = {
  storeIndustry: "GOLD" | "GENERAL";
  purity: number;
  weightGrams: string | number | Prisma.Decimal;
  makingFeeType: string;
  makingFeeValue: string | number | Prisma.Decimal;
  profitPercent: string | number | Prisma.Decimal;
  taxPercent: string | number | Prisma.Decimal;
  fixedPrice: { toString(): string } | null;
  discountType: "PERCENT" | "FIXED" | null;
  discountValue: { toString(): string } | null;
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
  variants: StoredVariantRow[];
};

/** The columns of a combination this module needs; `Decimal` arrives as an object with toString. */
type StoredVariantRow = {
  selectionKey: string;
  selection: unknown;
  price: { toString(): string } | null;
  weightGrams: { toString(): string } | null;
  discountType: "PERCENT" | "FIXED" | null;
  discountValue: { toString(): string } | null;
  stock: number;
  isActive: boolean;
};

/**
 * The unit price of a line, before and after discount, or null when it cannot be worked out —
 * a gold product with no live rate, which the caller must report rather than sell at zero.
 *
 * The combination named by `selectionKey` overrides the product's price, weight and discount;
 * anything it leaves unset falls through to the product.
 */
export function lineUnitPrice(product: PricedProduct, selectionKey: string, goldRate: number | Prisma.Decimal | null) {
  const variant = selectionKey ? findVariant(product.variants, selectionKey) : null;
  const resolved = variantPricing(variant, product);

  const base = product.storeIndustry === "GENERAL"
    ? resolved.fixedPrice ?? 0
    : resolved.fixedPrice ?? (goldRate === null ? null : calculateProductPrice({
      goldPricePerGram18: Number(goldRate),
      weightGrams: resolved.weightGrams,
      purity: product.purity,
      makingFeeType: product.makingFeeType,
      makingFeeValue: product.makingFeeValue,
      profitPercent: product.profitPercent,
      taxPercent: product.taxPercent,
    }).total);

  if (base === null) return null;

  // The window stays the product's; only the type and the amount can be overridden, so a shop
  // can discount one colour without restating when the sale runs.
  return calculateDiscountedPrice(base, {
    discountType: resolved.discountType,
    discountValue: resolved.discountValue,
    discountStartsAt: product.discountStartsAt,
    discountEndsAt: product.discountEndsAt,
  });
}
