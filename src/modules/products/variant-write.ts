import type { Prisma } from "@generated/prisma/client";
import { tehranDateEnd, tehranDateStart } from "@/modules/products/discount";
import { variantSelectionKey, type VariantSelection } from "@/modules/products/variants";

/*
 * Saving a product's variant setup.
 *
 * The form sends which library types the product offers and one row per combination. Nothing it
 * sends is trusted: the types and values are checked against the library, and each combination's
 * key is hashed here rather than accepted from the browser, so the key a cart line was stored
 * with cannot be forged or drift.
 */

export type ProductOptionTypeInput = { typeId: string; valueIds: string[] };

export type ProductVariantInput = {
  selection: VariantSelection;
  price: string | null;
  weightGrams: string | null;
  discountType: "PERCENT" | "FIXED" | null;
  discountValue: string | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  stock: number;
  isActive: boolean;
};

export type VariantWriteError = { message: string };

type WriteTransaction = Pick<Prisma.TransactionClient, "optionType" | "optionValue" | "productOptionType" | "productOptionValue" | "productVariant">;

/**
 * Checks the chosen types and values against the library, and that every combination is made of
 * exactly those values — a selection naming a value the product does not offer would be
 * unreachable in the storefront and unpriceable in the cart.
 */
export async function validateVariantSetup(
  db: Pick<Prisma.TransactionClient, "optionType">,
  optionTypes: ProductOptionTypeInput[],
  variants: ProductVariantInput[],
): Promise<VariantWriteError | null> {
  if (!optionTypes.length) {
    return variants.length ? { message: "برای تعریف ترکیب، ابتدا نوع تنوع محصول را انتخاب کنید." } : null;
  }

  const types = await db.optionType.findMany({
    where: { id: { in: optionTypes.map((type) => type.typeId) }, isActive: true },
    select: { id: true, name: true, values: { where: { isActive: true }, select: { id: true, label: true } } },
  });
  if (types.length !== optionTypes.length) return { message: "یک یا چند نوع تنوع انتخاب‌شده معتبر یا فعال نیست." };

  const typesById = new Map(types.map((type) => [type.id, type]));
  /** Type name → the labels this product offers from it, which is what a selection must match. */
  const offered = new Map<string, Set<string>>();
  for (const chosen of optionTypes) {
    const type = typesById.get(chosen.typeId)!;
    const valuesById = new Map(type.values.map((value) => [value.id, value.label]));
    const labels = chosen.valueIds.map((valueId) => valuesById.get(valueId));
    if (labels.some((label) => label === undefined)) return { message: `یک یا چند مقدارِ «${type.name}» معتبر یا فعال نیست.` };
    offered.set(type.name, new Set(labels as string[]));
  }

  for (const variant of variants) {
    const names = Object.keys(variant.selection);
    if (names.length !== offered.size || names.some((name) => !offered.has(name))) {
      return { message: "هر ترکیب باید دقیقاً از همان نوع‌های انتخاب‌شده محصول ساخته شود." };
    }
    if (names.some((name) => !offered.get(name)!.has(variant.selection[name]))) {
      return { message: "یکی از ترکیب‌ها مقداری دارد که برای این محصول انتخاب نشده است." };
    }
  }
  return null;
}

/**
 * Replaces the product's types and combinations.
 *
 * Combinations are matched by key so a row that survives an edit keeps its id — and with it any
 * order that refers to it — instead of being deleted and recreated under a new one.
 */
export async function writeVariantSetup(
  tx: WriteTransaction,
  productId: string,
  optionTypes: ProductOptionTypeInput[],
  variants: ProductVariantInput[],
) {
  // The join rows carry the composite key themselves, so they are written flat rather than
  // nested — Prisma will not let a nested create restate the parent's own key columns.
  await tx.productOptionType.deleteMany({ where: { productId } });
  if (optionTypes.length) {
    await tx.productOptionType.createMany({
      data: optionTypes.map((chosen, position) => ({ productId, typeId: chosen.typeId, position })),
    });
    await tx.productOptionValue.createMany({
      data: optionTypes.flatMap((chosen) => chosen.valueIds.map((valueId, position) => ({
        productId, typeId: chosen.typeId, valueId, position,
      }))),
    });
  }

  const rows = variants.map((variant) => ({ ...variant, selectionKey: variantSelectionKey(variant.selection) }));
  const keys = rows.map((row) => row.selectionKey);
  await tx.productVariant.deleteMany({ where: { productId, ...(keys.length ? { selectionKey: { notIn: keys } } : {}) } });

  for (const row of rows) {
    const data = {
      selection: row.selection,
      price: row.price,
      weightGrams: row.weightGrams,
      discountType: row.discountType,
      discountValue: row.discountValue,
      // Same bare-date-means-the-whole-Tehran-day handling as the product's own window.
      discountStartsAt: tehranDateStart(row.discountStartsAt),
      discountEndsAt: tehranDateEnd(row.discountEndsAt),
      stock: row.stock,
      isActive: row.isActive,
    };
    await tx.productVariant.upsert({
      where: { productId_selectionKey: { productId, selectionKey: row.selectionKey } },
      create: { productId, selectionKey: row.selectionKey, ...data },
      update: data,
    });
  }
}
