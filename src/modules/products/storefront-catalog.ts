import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { parseCategoryAttributeSchema, parseProductAttributes } from "@/modules/products/attributes";
import { parseOptionValues } from "@/modules/products/options";
import { calculateProductPrice } from "@/modules/products/pricing";
import { matchesTomanPrice, type StorefrontCatalogQuery, type StorefrontCatalogResult } from "@/modules/products/storefront-catalog-contract";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";

const catalogProductSelect = {
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
  createdAt: true,
  category: { select: { name: true } },
  options: { select: { values: true } },
  media: {
    orderBy: { position: "asc" as const },
    take: 1,
    select: { media: { select: { type: true, url: true, alt: true } } },
  },
  _count: { select: { orderItems: true } },
} satisfies Prisma.ProductSelect;

type CatalogProduct = Prisma.ProductGetPayload<{ select: typeof catalogProductSelect }>;
type PricedProduct = { product: CatalogProduct; finalPriceRials: number | null; originalPriceRials?: number };

function productColorIds(product: CatalogProduct) {
  return [...new Set(product.options.flatMap((option) => parseOptionValues(option.values).flatMap((value) => value.isActive && value.colorId ? [value.colorId] : [])))];
}

function selectedAttributeValues(tokens: string[] | undefined) {
  const selected = new Map<string, Set<string>>();
  for (const token of tokens ?? []) {
    const separator = token.indexOf("::");
    if (separator < 1) continue;
    const attributeId = token.slice(0, separator);
    const value = token.slice(separator + 2);
    if (!value) continue;
    const values = selected.get(attributeId) ?? new Set<string>();
    values.add(value);
    selected.set(attributeId, values);
  }
  return selected;
}

function matchesFacetFilters(product: CatalogProduct, query: StorefrontCatalogQuery) {
  if (query.inStock && product.stock <= 0) return false;
  const selectedColors = new Set(query.color ?? []);
  if (selectedColors.size > 0 && !productColorIds(product).some((id) => selectedColors.has(id))) return false;
  const attributes = new Map(parseProductAttributes(product.attributes).map((attribute) => [attribute.attributeId, new Set(attribute.values)]));
  for (const [attributeId, selectedValues] of selectedAttributeValues(query.attr)) {
    const productValues = attributes.get(attributeId);
    if (!productValues || ![...selectedValues].some((value) => productValues.has(value))) return false;
  }
  return true;
}

function mockRating(productId: string) {
  const seed = [...productId].reduce((total, character) => total + character.charCodeAt(0), 0);
  return 4.1 + (seed % 8) / 10;
}

function sortProducts(items: PricedProduct[], sortby: StorefrontCatalogQuery["sortby"]) {
  return [...items].sort((left, right) => {
    if (sortby === "oldest") return left.product.createdAt.getTime() - right.product.createdAt.getTime();
    if (sortby === "popular") return right.product._count.orderItems - left.product._count.orderItems || right.product.createdAt.getTime() - left.product.createdAt.getTime();
    if (sortby === "price-asc") return (left.finalPriceRials ?? Number.POSITIVE_INFINITY) - (right.finalPriceRials ?? Number.POSITIVE_INFINITY);
    if (sortby === "price-desc") return (right.finalPriceRials ?? Number.NEGATIVE_INFINITY) - (left.finalPriceRials ?? Number.NEGATIVE_INFINITY);
    return right.product.createdAt.getTime() - left.product.createdAt.getTime();
  });
}

export async function getStorefrontCatalog(query: StorefrontCatalogQuery, categoryIds?: string[]): Promise<StorefrontCatalogResult> {
  const [settings, catalogSettings] = await Promise.all([getGeneralStoreSettings(), getCatalogSettings()]);
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    storeIndustry: settings.industry,
    ...(query.q ? { OR: [{ name: { contains: query.q } }, { sku: { contains: query.q } }, { slug: { contains: query.q } }, { category: { name: { contains: query.q } } }] } : {}),
    ...(catalogSettings.hideOutOfStockProducts ? { stock: { gt: 0 } } : {}),
    ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
  };
  const [products, gold, facetCategories] = await Promise.all([
    db.product.findMany({ where, select: catalogProductSelect }),
    settings.industry === "GOLD" ? getGoldPriceForDisplay() : Promise.resolve(null),
    db.category.findMany({ where: { isActive: true, ...(categoryIds ? { id: { in: categoryIds } } : {}) }, select: { attributeSchema: true } }),
  ]);
  const goldPrice = gold ? Number(gold.pricePerGram18) : null;
  const pricedProducts = products.map((product) => {
    const calculated = goldPrice === null || product.storeIndustry !== "GOLD" ? null : calculateProductPrice({
      goldPricePerGram18: goldPrice,
      weightGrams: Number(product.weightGrams),
      purity: product.purity,
      makingFeeType: product.makingFeeType,
      makingFeeValue: Number(product.makingFeeValue),
      profitPercent: Number(product.profitPercent),
      taxPercent: Number(product.taxPercent),
    });
    const baseAmount = product.fixedPrice ? Number(product.fixedPrice) : calculated?.total ?? null;
    const discounted = baseAmount === null ? null : calculateDiscountedPrice(baseAmount, product);
    return { product, finalPriceRials: discounted?.finalPrice ?? null, originalPriceRials: discounted?.isActive ? discounted.originalPrice : undefined };
  });

  const allColorIds = [...new Set(products.flatMap(productColorIds))];
  const colors = allColorIds.length ? await db.color.findMany({
    where: { id: { in: allColorIds }, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, hex: true },
  }) : [];
  const colorsById = new Map(colors.map((color) => [color.id, color]));
  const colorCounts = new Map<string, number>();
  for (const product of products) for (const colorId of productColorIds(product)) colorCounts.set(colorId, (colorCounts.get(colorId) ?? 0) + 1);

  const attributeDefinitions = new Map(facetCategories.flatMap((category) => parseCategoryAttributeSchema(category.attributeSchema).flatMap((group) => group.attributes.map((attribute) => [attribute.id, attribute.name] as const))));
  const attributeValueCounts = new Map<string, Map<string, number>>();
  for (const product of products) {
    for (const attribute of parseProductAttributes(product.attributes)) {
      if (!attributeDefinitions.has(attribute.attributeId)) continue;
      const counts = attributeValueCounts.get(attribute.attributeId) ?? new Map<string, number>();
      for (const value of new Set(attribute.values)) counts.set(value, (counts.get(value) ?? 0) + 1);
      attributeValueCounts.set(attribute.attributeId, counts);
    }
  }
  const availablePrices = pricedProducts.flatMap(({ finalPriceRials }) => finalPriceRials === null ? [] : [finalPriceRials / 10]);
  const filteredProducts = pricedProducts.filter(({ product, finalPriceRials, originalPriceRials }) =>
    (!query.hasDiscount || originalPriceRials !== undefined)
    && matchesTomanPrice(finalPriceRials, query.MinPrice, query.MaxPrice)
    && matchesFacetFilters(product, query));

  const sortedProducts = sortProducts(filteredProducts, query.sortby);
  const pageSize = catalogSettings.catalogPageSize;
  const totalItems = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(query.page, totalPages);
  const pageProducts = sortedProducts.slice((page - 1) * pageSize, page * pageSize);

  return {
    filters: { q: query.q, sortby: query.sortby, MinPrice: query.MinPrice, MaxPrice: query.MaxPrice, category: query.category, color: query.color, attr: query.attr, inStock: query.inStock, hasDiscount: query.hasDiscount },
    facets: {
      colors: colors.map((color) => ({ ...color, count: colorCounts.get(color.id) ?? 0 })).filter((color) => color.count > 0),
      attributes: [...attributeDefinitions].flatMap(([id, name]) => {
        const values = [...(attributeValueCounts.get(id) ?? [])].map(([value, count]) => ({ value, count })).sort((left, right) => left.value.localeCompare(right.value, "fa"));
        return values.length ? [{ id, name, values }] : [];
      }),
      priceRange: availablePrices.length ? { min: Math.floor(Math.min(...availablePrices)), max: Math.ceil(Math.max(...availablePrices)) } : null,
    },
    pagination: { page, pageSize, totalItems, totalPages },
    items: pageProducts.map(({ product, finalPriceRials, originalPriceRials }) => {
      const media = product.media[0]?.media;
      return {
        id: product.id,
        href: `/products/${product.slug}`,
        name: product.name,
        category: product.category?.name ?? (product.storeIndustry === "GOLD" ? "طلا" : "محصول"),
        industry: product.storeIndustry,
        weight: Number(product.weightGrams),
        purity: product.purity,
        discountPercent: originalPriceRials !== undefined && finalPriceRials !== null ? Math.round((originalPriceRials - finalPriceRials) / originalPriceRials * 100) : undefined,
        price: finalPriceRials === null ? "قیمت موقتاً در دسترس نیست" : formatMoney(finalPriceRials, settings.currency),
        originalPrice: originalPriceRials === undefined ? undefined : formatMoney(originalPriceRials, settings.currency),
        image: media?.type === "IMAGE" ? { src: media.url, alt: media.alt ?? product.name } : undefined,
        stock: product.stock,
        rating: mockRating(product.id),
        colors: productColorIds(product).flatMap((id) => colorsById.has(id) ? [colorsById.get(id)!] : []),
      };
    }),
  };
}
