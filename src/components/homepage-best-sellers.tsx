import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import type { StorefrontProductCardItem } from "@/modules/products/storefront-feed-contract";
import { DiscountExpiryRefresh } from "@/components/discount-expiry-refresh";
import { earliestDiscountExpiry } from "@/modules/products/discount";

const itemsPerColumn = 3;

export function HomepageBestSellers({ products }: { products: StorefrontProductCardItem[] }) {
  const rankedProducts = products.slice(0, 12);
  if (!rankedProducts.length) return null;
  const columns = Array.from({ length: Math.ceil(rankedProducts.length / itemsPerColumn) }, (_, index) => rankedProducts.slice(index * itemsPerColumn, (index + 1) * itemsPerColumn));

  return <section className="overflow-hidden rounded-2xl border border-[#e6e8ec] bg-white px-4 py-6 sm:px-6 lg:px-8 lg:py-8" aria-labelledby="best-selling-products">
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-slate-100 pb-5">
      <h2 id="best-selling-products" className="m-0 text-xl font-bold text-[#232934] sm:text-2xl">پرفروش‌ترین کالاها</h2>
      <Link href="/products?sortby=popular" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#232934] transition hover:text-black">مشاهده همه<ChevronLeft size={15} /></Link>
    </div>
    <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-4 lg:gap-0 lg:overflow-visible lg:pb-0">
      {columns.map((column, columnIndex) => <div key={column[0]?.id ?? columnIndex} className="grid min-w-[285px] snap-start divide-y divide-slate-100 px-1 sm:min-w-[330px] lg:min-w-0 lg:border-l lg:border-slate-100 lg:px-5 lg:last:border-l-0">
        {column.map((product, rowIndex) => {
          const rank = columnIndex * itemsPerColumn + rowIndex + 1;
          return <Link key={product.id} href={product.href} className="group grid min-h-[108px] grid-cols-[76px_30px_minmax(0,1fr)] items-center gap-3 py-3.5">
            <span className="relative block aspect-square overflow-hidden rounded-xl bg-[#f3f4f6]">
              {product.image ? <Image src={product.image.src} alt={product.image.alt} fill sizes="76px" className="object-cover transition duration-300 group-hover:scale-105" /> : <span className="grid h-full place-items-center text-slate-300"><ShoppingBag size={25} strokeWidth={1.4} /></span>}
            </span>
            <span className="grid size-7 place-items-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-[0_5px_14px_rgba(244,63,94,.22)]">{rank.toLocaleString("fa-IR")}</span>
            <span className="min-w-0"><strong className="line-clamp-2 block text-xs leading-6 text-[#42495a] transition group-hover:text-[var(--brand-primary)]">{product.name}</strong><small className="mt-1 block truncate text-[10px] text-[#9298a2]">{product.category} · {product.price}</small></span>
          </Link>;
        })}
      </div>)}
    </div>
  <DiscountExpiryRefresh at={earliestDiscountExpiry(rankedProducts)} /></section>;
}
