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

export async function getStorefrontProductFeed(input: { sort: StorefrontProductSort; page: number }): Promise<StorefrontProductFeed> {
  const [settings, catalogSettings] = await Promise.all([getGeneralStoreSettings(), getCatalogSettings()]);
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    ...(catalogSettings.hideOutOfStockProducts ? { stock: { gt: 0 } } : {}),
  };
  const totalItems = await db.product.count({ where });
  const pageSize = catalogSettings.catalogPageSize;
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
  const goldPrice = gold ? Number(gold.pricePerGram18) : null;

  return {
    sort: input.sort,
    pagination: { page, pageSize, totalItems, totalPages },
    items: products.map((product) => {
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
        price: discounted ? formatMoney(discounted.finalPrice, settings.currency) : "قیمت موقتاً در دسترس نیست",
        originalPrice: discounted?.isActive ? formatMoney(discounted.originalPrice, settings.currency) : undefined,
        image: media?.type === "IMAGE" ? { src: media.url, alt: media.alt ?? product.name } : undefined,
      };
    }),
  };
}
