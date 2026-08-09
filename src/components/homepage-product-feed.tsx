"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Alert, Button, Spinner } from "@heroui/react";
import { RotateCw } from "lucide-react";
import { DragScrollRow } from "@/components/drag-scroll-row";
import { ProductCard } from "@/components/product-card";
import { ViewAllProductCard } from "@/components/view-all-product-card";
import type { StorefrontProductFeed, StorefrontProductSort } from "@/modules/products/storefront-feed-contract";

const filters: Array<{ id: StorefrontProductSort; label: string; mobile: boolean }> = [
  { id: "LATEST", label: "جدیدترین‌ها", mobile: true },
  { id: "POPULAR", label: "محبوب‌ترین‌ها", mobile: true },
  { id: "LOW_FEE", label: "کم‌اجرت‌ها", mobile: false },
];

type Props = { initialFeed: StorefrontProductFeed; industry?: "GOLD" | "GENERAL" };

export function HomepageProductFeed({ initialFeed, industry = "GOLD" }: Props) {
  const [feed, setFeed] = useState(initialFeed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  async function load(sort: StorefrontProductSort, page: number) {
    if (loading && sort === feed.sort && page === feed.pagination.page) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ sort, page: String(page) });
      const response = await fetch(`/api/storefront/products?${params}`, { cache: "no-store", signal: controller.signal });
      const payload = await response.json().catch(() => null) as StorefrontProductFeed | { message?: string } | null;
      if (!response.ok) throw new Error(payload && "message" in payload ? payload.message : "محصولات دریافت نشدند.");
      if (!controller.signal.aborted) setFeed(payload as StorefrontProductFeed);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <div dir="rtl">
      {industry === "GOLD" && <div className="mb-7 flex items-end justify-between gap-4">
        <nav className="flex flex-wrap gap-2" aria-label="مرتب‌سازی محصولات">
          {filters.filter((filter) => industry === "GOLD" || filter.id !== "LOW_FEE").map((filter) => <Button key={filter.id} id={filter.id === "LATEST" ? "latest-products" : undefined} type="button" size="sm" variant={feed.sort === filter.id ? "primary" : "secondary"} isDisabled={loading && feed.sort === filter.id} onPress={() => void load(filter.id, 1)} className={`${filter.mobile ? "" : "hidden sm:inline-flex"} min-h-9 rounded-full px-5 text-xs font-bold ${feed.sort === filter.id ? "bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "bg-[#fafafa] text-[#333]"}`}>{filter.label}</Button>)}
        </nav>
        <Link href="/products" className="shrink-0 border-b-2 border-[var(--brand-primary)] pb-1 text-sm font-bold text-[var(--brand-primary)]">مشاهده بیشتر</Link>
      </div>}

      <div className="relative min-h-[260px]" aria-live="polite" aria-busy={loading}>
        {loading && <div className="absolute inset-0 z-20 grid place-items-center rounded-[7px] bg-white/80 backdrop-blur-[1px]"><div className="grid justify-items-center gap-2"><Spinner color="current" className="text-[var(--brand-primary)]" aria-label="در حال دریافت محصولات" /><span className="text-xs text-[#666]">در حال دریافت محصولات…</span></div></div>}

        {error ? <Alert status="danger" className="min-h-[180px] place-content-center text-right"><Alert.Description><span className="block">{error}</span><Button type="button" size="sm" variant="secondary" onPress={() => void load(feed.sort, feed.pagination.page)} className="mt-3 gap-2"><RotateCw size={14} />تلاش دوباره</Button></Alert.Description></Alert> : feed.items.length ? (
          <DragScrollRow key={`${feed.sort}-${feed.pagination.page}`} ariaLabel="محصولات فروشگاه" showNavigation={industry === "GENERAL"} className="flex w-full min-w-0 max-w-full gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {feed.items.map((product, index) => <div key={product.id} className="w-[calc(50%-8px)] min-w-[calc(50%-8px)] snap-start sm:w-[220px] sm:min-w-[220px] lg:w-[224px] lg:min-w-[224px]"><ProductCard {...product} storefrontVariant="gallery" imageTone={index % 4} /></div>)}
            {industry === "GENERAL" && <div className="w-[calc(50%-8px)] min-w-[calc(50%-8px)] snap-start sm:w-[220px] sm:min-w-[220px] lg:w-[224px] lg:min-w-[224px]"><ViewAllProductCard href="/products" /></div>}
          </DragScrollRow>
        ) : <div className="grid h-[260px] place-items-center rounded-[7px] bg-[#f8f8f8] text-sm text-[#777]">محصولی برای نمایش وجود ندارد.</div>}
      </div>

    </div>
  );
}
