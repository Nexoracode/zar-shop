import { db } from "@/lib/db";
import { earliestDiscountEnd } from "@/modules/products/discount-window";
import { getStorefrontBestSellers, getStorefrontFlashDeals, getStorefrontProductFeed } from "@/modules/products/storefront-feed";
import type { StorefrontProductCardItem } from "@/modules/products/storefront-feed-contract";
import { productListMoreHref, type ProductListConfig } from "@/modules/page-builder/product-lists";

export type ProductListData = {
  products: StorefrontProductCardItem[];
  /** For a discounted list: when the earliest running discount ends, as an ISO time (the section timer counts down to it). */
  expiry: string | null;
  moreHref: string;
};

/** The products a product list shows, by its source, and where its "view more" link goes. */
export async function getProductListData(config: ProductListConfig): Promise<ProductListData> {
  if (config.source === "DISCOUNTED") {
    const products = await getStorefrontFlashDeals(config.limit);
    return { products, expiry: earliestDiscountEnd(products), moreHref: productListMoreHref(config, null) };
  }
  if (config.source === "BEST_SELLING") return { products: await getStorefrontBestSellers({ limit: config.limit }), expiry: null, moreHref: productListMoreHref(config, null) };
  const category = config.source === "CATEGORY" && config.categoryId
    ? await db.category.findFirst({ where: { id: config.categoryId, isActive: true }, select: { slug: true } })
    : null;
  // A list on a category that no longer exists (or was switched off) has nothing to show.
  if (config.source === "CATEGORY" && !category) return { products: [], expiry: null, moreHref: "/products" };
  const feed = await getStorefrontProductFeed({
    sort: config.source === "POPULAR" ? "POPULAR" : "LATEST",
    page: 1,
    pageSize: config.limit,
    categoryId: config.source === "CATEGORY" ? config.categoryId ?? undefined : undefined,
  });
  return { products: feed.items, expiry: null, moreHref: productListMoreHref(config, category?.slug ?? null) };
}
