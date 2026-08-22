import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { calculateProductPrice } from "@/modules/products/pricing";
import type { StorefrontProductFeed, StorefrontProductSort } from "@/modules/products/storefront-feed-contract";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";

const productSelect = {
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
  category: { select: { name: true } },
  media: {
    orderBy: { position: "asc" as const },
    take: 1,
    select: { media: { select: { type: true, url: true, alt: true } } },
  },
} satisfies Prisma.ProductSelect;

function orderByFor(sort: StorefrontProductSort): Prisma.ProductOrderByWithRelationInput[] {
  if (sort === "POPULAR") return [{ orderItems: { _count: "desc" } }, { createdAt: "desc" }];
  if (sort === "LOW_FEE") return [{ makingFeeValue: "asc" }, { createdAt: "desc" }];
  return [{ createdAt: "desc" }];
}

type SelectedProduct = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

function serializeProductCard(product: SelectedProduct, goldPrice: Prisma.Decimal | null, currency: "IRR" | "IRT") {
  const calculated = goldPrice === null || product.storeIndustry !== "GOLD" ? null : calculateProductPrice({
    goldPricePerGram18: goldPrice,
    weightGrams: product.weightGrams,
    purity: product.purity,
    makingFeeType: product.makingFeeType,
    makingFeeValue: product.makingFeeValue,
    profitPercent: product.profitPercent,
    taxPercent: product.taxPercent,
  });
  const baseAmount = product.fixedPrice ? Number(product.fixedPrice) : calculated?.total ?? null;
  const discounted = baseAmount === null ? null : calculateDiscountedPrice(baseAmount, product);
  const media = product.media[0]?.media;

  return {
    id: product.id,
    href: `/products/${product.slug}`,
    name: product.name,
    category: product.category?.name ?? (product.storeIndustry === "GOLD" ? "طلا" : "محصول"),
    industry: product.storeIndustry,
    weight: Number(product.weightGrams),
    purity: product.purity,
    makingFee: product.storeIndustry === "GOLD" ? { type: product.makingFeeType === "FIXED" ? "FIXED" as const : "PERCENT" as const, value: Number(product.makingFeeValue) } : undefined,
    discountPercent: discounted?.isActive && product.discountType === "PERCENT" ? Number(product.discountValue ?? 0) : undefined,
    price: discounted ? formatMoney(discounted.finalPrice, currency) : "قیمت موقتاً در دسترس نیست",
    originalPrice: discounted?.isActive ? formatMoney(discounted.originalPrice, currency) : undefined,
    image: media?.type === "IMAGE" ? { src: media.url, alt: media.alt ?? product.name } : undefined,
  };
}

export async function getStorefrontProductFeed(input: { sort: StorefrontProductSort; page: number; pageSize?: number; categoryId?: string; excludeProductId?: string }): Promise<StorefrontProductFeed> {
  const [settings, catalogSettings] = await Promise.all([getGeneralStoreSettings(), getCatalogSettings()]);
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    storeIndustry: settings.industry,
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    ...(input.excludeProductId ? { id: { not: input.excludeProductId } } : {}),
    ...(catalogSettings.hideOutOfStockProducts ? { stock: { gt: 0 } } : {}),
  };
  const totalItems = await db.product.count({ where });
  const pageSize = input.pageSize ?? catalogSettings.catalogPageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(input.page, totalPages);

  const [gold, products] = await Promise.all([
    settings.industry === "GOLD" ? getGoldPriceForDisplay() : Promise.resolve(null),
    db.product.findMany({
      where,
      select: productSelect,
      orderBy: orderByFor(input.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const goldPrice = gold?.pricePerGram18 ?? null;

  return {
    sort: input.sort,
    pagination: { page, pageSize, totalItems, totalPages },
    items: products.map((product) => serializeProductCard(product, goldPrice, settings.currency)),
  };
}

/**
 * Products a signed-in customer looked at recently, newest visit first. Visits to
 * inactive/removed products or ones outside the store's current industry are skipped
 * rather than surfaced as broken cards.
 */
export async function getRecentlyViewedProducts(input: { userId: string; excludeProductId?: string; limit?: number }) {
  const limit = input.limit ?? 10;
  const [settings, visits] = await Promise.all([
    getGeneralStoreSettings(),
    db.productVisit.findMany({
      where: { userId: input.userId, ...(input.excludeProductId ? { productId: { not: input.excludeProductId } } : {}) },
      orderBy: { visitedAt: "desc" },
      take: limit * 2,
      select: { productId: true },
    }),
  ]);
  const orderedIds = [...new Set(visits.map((visit) => visit.productId))].slice(0, limit);
  if (!orderedIds.length) return [];
  const [gold, products] = await Promise.all([
    settings.industry === "GOLD" ? getGoldPriceForDisplay() : Promise.resolve(null),
    db.product.findMany({ where: { id: { in: orderedIds }, status: "ACTIVE", storeIndustry: settings.industry }, select: productSelect }),
  ]);
  const goldPrice = gold?.pricePerGram18 ?? null;
  const byId = new Map(products.map((product) => [product.id, product]));
  return orderedIds.flatMap((id) => {
    const product = byId.get(id);
    return product ? [serializeProductCard(product, goldPrice, settings.currency)] : [];
  });
}
