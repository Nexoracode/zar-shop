import type { Prisma } from "../../generated/prisma/client";
import { syncProductMirror } from "../../src/modules/products/variant-write";
import { buildCombinations, type VariantSelection } from "../../src/modules/products/variant-combinations";
import { variantSelectionKey } from "../../src/modules/products/variants";
import type { DevelopmentStoreSeed, DevelopmentVariantProductSeed } from "./types";

const DAY = 86_400_000;

function matches(selection: VariantSelection, partial: Readonly<Record<string, string>>) {
  return Object.entries(partial).every(([name, value]) => selection[name] === value);
}

/** The discount a combination carries, if any, with its window resolved against the day the seed runs. */
function discountFor(spec: DevelopmentVariantProductSeed, selection: VariantSelection, now: Date) {
  const discount = spec.discounts?.find((entry) => matches(selection, entry.match));
  if (!discount) return { discountType: null, discountValue: null, discountStartsAt: null, discountEndsAt: null };
  const window: [Date | null, Date | null] = {
    // Running now with an end date, so the "ends on …" line has something to show.
    running: [new Date(now.getTime() - 6 * DAY), new Date(now.getTime() + 21 * DAY)] as [Date, Date],
    // A standing special sale: no window at all.
    open: [null, null] as [null, null],
    // Scheduled: listed as upcoming until it opens.
    upcoming: [new Date(now.getTime() + 4 * DAY), new Date(now.getTime() + 18 * DAY)] as [Date, Date],
  }[discount.window];
  return { discountType: "PERCENT" as const, discountValue: String(discount.percent), discountStartsAt: window[0], discountEndsAt: window[1] };
}

/**
 * The shared colour and option libraries, then every product sold by combination — written the way
 * the admin form would write them: library types and values, one row per combination, and the
 * product's mirror columns synced from those combinations at the end.
 *
 * Runs on a freshly wiped database, so libraries are created rather than looked up. Stock is derived
 * from the product's and the combination's position, so a reseed always gives the same catalogue.
 */
export async function createVariantCatalog(
  db: Prisma.TransactionClient,
  seed: DevelopmentStoreSeed,
  context: { categoryIds: Map<string, string>; brandIds: Map<string, string>; resolveMediaId: (key: string | undefined) => string | null; now: Date },
) {
  const products = seed.variantProducts ?? [];
  if (!products.length) return { colors: 0, optionTypes: 0, products: 0, variants: 0 };
  if (seed.industry !== "GENERAL") throw new Error("Products sold by combination are only seeded for a general shop.");

  const colorIds = new Map<string, string>();
  for (const [index, color] of (seed.colors ?? []).entries()) {
    const created = await db.color.create({ data: { name: color.name, hex: color.hex, sortOrder: (index + 1) * 10 } });
    colorIds.set(color.name, created.id);
  }

  const typeIds = new Map<string, string>();
  const valueIds = new Map<string, Map<string, string>>();
  for (const [typeIndex, type] of (seed.optionTypes ?? []).entries()) {
    const created = await db.optionType.create({ data: { name: type.name, kind: type.kind, sortOrder: (typeIndex + 1) * 10 } });
    typeIds.set(type.name, created.id);
    const byLabel = new Map<string, string>();
    for (const [valueIndex, label] of type.values.entries()) {
      const colorId = type.kind === "COLOR" ? colorIds.get(label) : undefined;
      if (type.kind === "COLOR" && !colorId) throw new Error(`Seed colour not found: ${label}`);
      const value = await db.optionValue.create({ data: { typeId: created.id, label, colorId: colorId ?? null, sortOrder: (valueIndex + 1) * 10 } });
      byLabel.set(label, value.id);
    }
    valueIds.set(type.name, byLabel);
  }

  let variantCount = 0;
  for (const [productIndex, spec] of products.entries()) {
    const categoryId = context.categoryIds.get(spec.categorySlug);
    if (!categoryId) throw new Error(`Seed category not found: ${spec.categorySlug}`);
    const brandId = context.brandIds.get(spec.brandSlug);
    if (!brandId) throw new Error(`Seed brand not found: ${spec.brandSlug}`);

    const combinations = buildCombinations(spec.types.map((entry) => ({ typeName: entry.type, values: [...entry.values] })));
    const product = await db.product.create({
      data: {
        sku: spec.sku, name: spec.name, slug: spec.slug, description: `<p>${spec.description}</p>`, status: "ACTIVE", storeIndustry: "GENERAL",
        categoryId, brandId, purity: 0, weightGrams: "0", makingFeeType: "PERCENT", makingFeeValue: "0", profitPercent: "0", taxPercent: "0",
        fixedPrice: String(spec.price), stock: 0, preparationDays: 2, attributes: [],
      },
      select: { id: true },
    });

    await db.productOptionType.createMany({
      data: spec.types.map((entry, position) => {
        const typeId = typeIds.get(entry.type);
        if (!typeId) throw new Error(`Seed option type not found: ${entry.type}`);
        return { productId: product.id, typeId, position };
      }),
    });
    await db.productOptionValue.createMany({
      data: spec.types.flatMap((entry) => entry.values.map((label, position) => {
        const valueId = valueIds.get(entry.type)?.get(label);
        if (!valueId) throw new Error(`Seed option value not found: ${entry.type} / ${label}`);
        return { productId: product.id, typeId: typeIds.get(entry.type)!, valueId, position };
      })),
    });

    await db.productVariant.createMany({
      data: combinations.map((selection, combinationIndex) => {
        const surcharge = Object.values(selection).reduce((sum, label) => sum + (spec.surcharge?.[label] ?? 0), 0);
        const soldOut = spec.soldOut?.some((entry) => matches(selection, entry)) ?? false;
        return {
          productId: product.id,
          selectionKey: variantSelectionKey(selection),
          selection,
          price: String(Math.round(spec.price * (1 + surcharge / 100) / 10_000) * 10_000),
          ...discountFor(spec, selection, context.now),
          stock: soldOut ? 0 : 2 + ((productIndex * 11 + combinationIndex * 7) % 23),
          preparationDays: 2,
          minOrderQuantity: 1,
          maxOrderQuantity: null,
          isActive: !(spec.switchedOff?.some((entry) => matches(selection, entry)) ?? false),
        };
      }),
    });
    variantCount += combinations.length;

    if (spec.media?.length) {
      await db.productMedia.createMany({
        data: spec.media.map((item, position) => ({ productId: product.id, mediaId: context.resolveMediaId(item.key)!, position, isCover: item.isCover ?? false })),
      });
    }

    await syncProductMirror(db, product.id);
  }

  return { colors: colorIds.size, optionTypes: typeIds.size, products: products.length, variants: variantCount };
}
