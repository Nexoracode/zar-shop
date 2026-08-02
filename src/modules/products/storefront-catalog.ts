import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { calculateDiscountedPrice } from "@/modules/products/discount";
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
  createdAt: true,
  category: { select: { name: true } },
  media: {
    orderBy: { position: "asc" as const },
    take: 1,
    select: { media: { select: { type: true, url: true, alt: true } } },
  },
  _count: { select: { orderItems: true } },
} satisfies Prisma.ProductSelect;

type CatalogProduct = Prisma.ProductGetPayload<{ select: typeof catalogProductSelect }>;
type PricedProduct = { product: CatalogProduct; finalPriceRials: number | null; originalPriceRials?: number };

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
    ...(catalogSettings.hideOutOfStockProducts ? { stock: { gt: 0 } } : {}),
    ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
  };
  const [products, gold] = await Promise.all([
    db.product.findMany({ where, select: catalogProductSelect }),
    settings.industry === "GOLD" ? getGoldPriceForDisplay() : Promise.resolve(null),
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
  }).filter(({ finalPriceRials }) => matchesTomanPrice(finalPriceRials, query.MinPrice, query.MaxPrice));

  const sortedProducts = sortProducts(pricedProducts, query.sortby);
  const pageSize = catalogSettings.catalogPageSize;
  const totalItems = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(query.page, totalPages);
  const pageProducts = sortedProducts.slice((page - 1) * pageSize, page * pageSize);

  return {
    filters: { sortby: query.sortby, MinPrice: query.MinPrice, MaxPrice: query.MaxPrice, category: query.category },
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
        discountPercent: originalPriceRials !== undefined && product.discountType === "PERCENT" ? Number(product.discountValue ?? 0) : undefined,
        price: finalPriceRials === null ? "قیمت موقتاً در دسترس نیست" : formatMoney(finalPriceRials, settings.currency),
        originalPrice: originalPriceRials === undefined ? undefined : formatMoney(originalPriceRials, settings.currency),
        image: media?.type === "IMAGE" ? { src: media.url, alt: media.alt ?? product.name } : undefined,
      };
    }),
  };
}
