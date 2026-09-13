"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { DiscountExpiryRefresh } from "@/components/discount-expiry-refresh";
import { earliestDiscountExpiry } from "@/modules/products/discount-window";
import type { StorefrontProductCardItem } from "@/modules/products/storefront-feed-contract";

type StorefrontCatalogGridProps = {
  initialItems: StorefrontProductCardItem[];
  initialPage: number;
  totalPages: number;
  /** How many skeleton cards to show, in place, while the next page loads. */
  pageSize: number;
  /** The current filter/sort/search query string, without a `page` param. */
  baseQuery: string;
};

/**
 * Renders the catalog grid and loads further pages as the shopper scrolls, instead of numbered
 * pagination. Keyed by `baseQuery` in the parent so a filter/sort change remounts it with a fresh
 * `initialItems`, while props changing for other reasons (e.g. a discount-expiry refresh) leaves
 * the already-scrolled list untouched.
 */
export function StorefrontCatalogGrid({ initialItems, initialPage, totalPages, pageSize, baseQuery }: StorefrontCatalogGridProps) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialPage < totalPages);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const response = await fetch(`/api/storefront/catalog?${baseQuery}&page=${nextPage}`);
      if (!response.ok) return;
      const data = (await response.json()) as { items: StorefrontProductCardItem[]; pagination: { page: number; totalPages: number } };
      setItems((current) => [...current, ...data.items]);
      setPage(data.pagination.page);
      setHasMore(data.pagination.page < data.pagination.totalPages);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [baseQuery, hasMore, page]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) loadMore(); }, { rootMargin: "600px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="mt-5 grid grid-cols-2 border-r border-t border-slate-200 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {items.map((product) => <ProductCard key={product.id} {...product} storefrontVariant="catalog" />)}
      {isLoading && Array.from({ length: pageSize }).map((_, index) => <ProductCardSkeleton key={`skeleton-${index}`} />)}
      <DiscountExpiryRefresh at={earliestDiscountExpiry(items)} />
      {!items.length && !isLoading && <div className="col-span-full grid min-h-72 place-items-center border-b border-l border-slate-200 px-4 text-center text-sm text-slate-500">محصولی مطابق فیلترهای انتخاب‌شده پیدا نشد.</div>}
      {hasMore && <div ref={sentinelRef} aria-hidden="true" className="col-span-full h-px" />}
    </div>
  );
}
