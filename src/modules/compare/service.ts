import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { buildProductAttributeGroups } from "@/modules/products/attributes";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { calculateProductPrice } from "@/modules/products/pricing";
import { COMPARE_MAX } from "@/modules/compare/compare";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";

export type CompareAttributeRow = { name: string; values: string[] };

export type CompareProduct = {
  id: string;
  slug: string;
  name: string;
  href: string;
  image: string | null;
  categoryId: string | null;
  categoryName: string | null;
  price: string | null;
  originalPrice: string | null;
  discountPercent: number | null;
  inStock: boolean;
  rating: number | null;
  reviewCount: number;
  attributes: CompareAttributeRow[];
};

export type ComparisonResult = {
  products: CompareProduct[];
  /** Every attribute name any product carries, in first-seen order — the table's row labels. */
  attributeNames: string[];
};

const compareSelect = {
  id: true,
  slug: true,
  name: true,
  storeIndustry: true,
  purity: true,
  weightGrams: true,
  makingFeeType: true,
  makingFeeValue: true,
  profitPercent: true,
  taxPercent: true,
  fixedPrice: true,
  discountType: true,
  discountValue: true,
  discountStartsAt: true,
  discountEndsAt: true,
  stock: true,
  attributes: true,
  categoryId: true,
  category: { select: { name: true, attributeSchema: true } },
  media: { orderBy: { position: "asc" as const }, take: 1, select: { media: { select: { type: true, url: true, alt: true } } } },
} satisfies Prisma.ProductSelect;

type CompareProductRow = Prisma.ProductGetPayload<{ select: typeof compareSelect }>;

/** The sale price of a product, mirroring the storefront card maths. */
function priceOf(product: CompareProductRow, goldRate: Prisma.Decimal | null) {
  const base = product.fixedPrice
    ? Number(product.fixedPrice)
    : product.storeIndustry === "GOLD" && goldRate !== null
      ? calculateProductPrice({
        goldPricePerGram18: goldRate,
        weightGrams: product.weightGrams,
        purity: product.purity,
        makingFeeType: product.makingFeeType,
        makingFeeValue: product.makingFeeValue,
        profitPercent: product.profitPercent,
        taxPercent: product.taxPercent,
      }).total
      : null;
  return base === null ? null : calculateDiscountedPrice(base, product);
}

/**
 * The side-by-side data for `/compare`. Only ACTIVE products of the current store industry are
 * returned, so a stale id from localStorage simply drops out. Order follows `ids`.
 */
export async function getComparison(ids: string[]): Promise<ComparisonResult> {
  const wanted = [...new Set(ids.filter(Boolean))].slice(0, COMPARE_MAX);
  if (!wanted.length) return { products: [], attributeNames: [] };

  const settings = await getGeneralStoreSettings();
  const [products, gold, ratings] = await Promise.all([
    db.product.findMany({ where: { id: { in: wanted }, status: "ACTIVE", storeIndustry: settings.industry }, select: compareSelect }),
    settings.industry === "GOLD" ? getGoldPriceForDisplay() : Promise.resolve(null),
    db.productReview.groupBy({ by: ["productId"], where: { productId: { in: wanted }, status: "APPROVED", parentId: null, rating: { not: null } }, _avg: { rating: true }, _count: { _all: true } }),
  ]);
  const goldRate = gold?.pricePerGram18 ?? null;
  const ratingByProduct = new Map(ratings.map((row) => [row.productId, { average: row._avg.rating ?? null, count: row._count._all }]));
  const byId = new Map(products.map((product) => [product.id, product]));

  const attributeNames: string[] = [];
  const seen = new Set<string>();

  const compareProducts: CompareProduct[] = wanted.flatMap((id) => {
    const product = byId.get(id);
    if (!product) return [];

    const priced = priceOf(product, goldRate);

    const groups = buildProductAttributeGroups(product.category?.attributeSchema, product.attributes);
    const attributes: CompareAttributeRow[] = groups.flatMap((group) => group.attributes.map((attribute) => ({ name: attribute.name, values: attribute.values })));
    for (const row of attributes) {
      if (seen.has(row.name)) continue;
      seen.add(row.name);
      attributeNames.push(row.name);
    }

    const media = product.media[0]?.media;
    const rating = ratingByProduct.get(product.id);
    return [{
      id: product.id,
      slug: product.slug,
      name: product.name,
      href: `/products/${product.slug}`,
      image: media?.type === "IMAGE" ? media.url : null,
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? null,
      price: priced ? formatMoney(priced.finalPrice, settings.currency) : null,
      originalPrice: priced?.isActive ? formatMoney(priced.originalPrice, settings.currency) : null,
      discountPercent: priced?.isActive && priced.originalPrice > 0 ? Math.round((priced.discountAmount / priced.originalPrice) * 100) : null,
      inStock: product.stock > 0,
      rating: rating?.average != null ? Math.round(rating.average * 10) / 10 : null,
      reviewCount: rating?.count ?? 0,
      attributes,
    }];
  });

  return { products: compareProducts, attributeNames };
}

export type ComparePickerItem = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  categoryId: string | null;
  categoryName: string | null;
  price: string | null;
  discountPercent: number | null;
  onSale: boolean;
  /** A couple of headline specs, shown as chips on the picker card. */
  chips: string[];
};

/**
 * Products for the "انتخاب کالا برای مقایسه" picker. Once the shopper has a product in the list,
 * `categoryId` is passed so only comparable products show; before that, the most-ordered products
 * lead. `excludeIds` drops whatever is already picked.
 */
export async function getComparePickerProducts(input: { q?: string; categoryId?: string | null; excludeIds?: string[]; limit?: number }): Promise<{ items: ComparePickerItem[]; total: number }> {
  const settings = await getGeneralStoreSettings();
  const limit = Math.min(Math.max(input.limit ?? 24, 1), 48);
  const query = input.q?.trim();
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    storeIndustry: settings.industry,
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    ...(query ? { OR: [{ name: { contains: query } }, { sku: { contains: query } }] } : {}),
    ...(input.excludeIds?.length ? { id: { notIn: input.excludeIds } } : {}),
  };

  const [products, total, gold] = await Promise.all([
    db.product.findMany({ where, select: compareSelect, orderBy: [{ orderItems: { _count: "desc" } }, { createdAt: "desc" }], take: limit }),
    db.product.count({ where }),
    settings.industry === "GOLD" ? getGoldPriceForDisplay() : Promise.resolve(null),
  ]);
  const goldRate = gold?.pricePerGram18 ?? null;

  const items: ComparePickerItem[] = products.map((product) => {
    const priced = priceOf(product, goldRate);
    const groups = buildProductAttributeGroups(product.category?.attributeSchema, product.attributes);
    const attributes = groups.flatMap((group) => group.attributes);
    const highlighted = attributes.filter((attribute) => attribute.important);
    const chips = (highlighted.length ? highlighted : attributes).slice(0, 3).map((attribute) => attribute.values.join("، "));
    const media = product.media[0]?.media;
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: media?.type === "IMAGE" ? media.url : null,
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? null,
      price: priced ? formatMoney(priced.finalPrice, settings.currency) : null,
      discountPercent: priced?.isActive && priced.originalPrice > 0 ? Math.round((priced.discountAmount / priced.originalPrice) * 100) : null,
      onSale: Boolean(priced?.isActive),
      chips,
    };
  });

  return { items, total };
}
