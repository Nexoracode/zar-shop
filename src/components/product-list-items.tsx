import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { BuilderPart } from "@/components/builder-part";
import { cardPart, type ProductCardBuilder } from "@/components/product-card";
import type { StorefrontProductCardItem } from "@/modules/products/storefront-feed-contract";

const placeholder = <span className="block size-full bg-[var(--surface-tertiary)]" aria-hidden="true" />;

/**
 * The compact way of showing a product used by the list layouts: a small image next to the name and price (or above
 * them, when `vertical`). It honours the same product-card switches (`card.image`, `card.name`, `card.originalPrice`,
 * `card.price`) as the full card, so a section's card settings apply whichever layout it uses.
 */
export function ProductThumbItem({ product, builder, vertical = false, large = false }: { product: StorefrontProductCardItem; builder?: ProductCardBuilder; vertical?: boolean; large?: boolean }) {
  const image = cardPart(builder, "image", product.image
    ? <Image src={product.image.src} alt={product.image.alt} fill sizes={large ? "96px" : "72px"} className="object-cover transition duration-300 group-hover:scale-105" />
    : placeholder);
  return (
    <Link href={product.href} className={`group flex min-w-0 gap-3 rounded-xl p-2 transition hover:bg-[#f6f7f9] ${vertical ? "flex-col" : "items-center"}`}>
      <span className={`relative shrink-0 overflow-hidden rounded-lg bg-[var(--surface-tertiary)] ${vertical ? "aspect-square w-full" : large ? "size-24" : "size-[72px]"}`}>{image}</span>
      <span className={`min-w-0 flex-1 text-right ${vertical ? "" : "grid gap-1"}`}>
        {cardPart(builder, "name", <span className={`line-clamp-2 block font-medium leading-6 text-slate-700 ${large ? "text-sm" : "text-xs"}`}>{product.name}</span>)}
        {cardPart(builder, "originalPrice", product.originalPrice ? <span className="block text-[0.7rem] text-slate-400 line-through">{product.originalPrice}</span> : null)}
        {cardPart(builder, "price", <strong className={`block text-[var(--brand-primary)] ${large ? "text-sm" : "text-[0.72rem]"}`}>{product.price}</strong>)}
      </span>
    </Link>
  );
}

/**
 * A large image tile for the layouts that feature one product: the picture fills the tile, the name and price sit on a
 * dark fade at its foot. Uses the same product-card switches as the other ways of showing a product.
 */
export function ProductFeatureTile({ product, builder, className = "" }: { product: StorefrontProductCardItem; builder?: ProductCardBuilder; className?: string }) {
  return (
    <Link href={product.href} className={`group relative block min-h-[220px] overflow-hidden rounded-2xl bg-[var(--surface-tertiary)] ${className}`}>
      {cardPart(builder, "image", product.image
        ? <Image src={product.image.src} alt={product.image.alt} fill sizes="(min-width: 1024px) 480px, 90vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
        : placeholder)}
      <span className="absolute inset-x-0 bottom-0 grid gap-1 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-4 pt-14 text-right text-white">
        {cardPart(builder, "name", <span className="line-clamp-2 block text-sm font-bold leading-6">{product.name}</span>)}
        <span className="flex items-center justify-end gap-2">
          {cardPart(builder, "originalPrice", product.originalPrice ? <span className="text-[0.7rem] text-white/70 line-through">{product.originalPrice}</span> : null)}
          {cardPart(builder, "price", <strong className="text-sm">{product.price}</strong>)}
        </span>
      </span>
    </Link>
  );
}

/**
 * One row of the ranked "list mode" (the look of the best-selling products): the picture, a numbered badge, the name
 * and a small "category · price" line. The rank is a switchable part of the section (`rank`); the rest honours the
 * product-card switches like every other way of showing a product.
 */
export function ProductRankedItem({ product, rank, builder }: { product: StorefrontProductCardItem; rank: number; builder?: ProductCardBuilder }) {
  const badge = <span className="grid size-7 place-items-center rounded-full bg-[var(--danger)] text-[11px] font-bold text-white shadow-[0_5px_14px_rgba(244,63,94,.22)]">{rank.toLocaleString("fa-IR")}</span>;
  return (
    <Link href={product.href} className="group grid min-h-[108px] grid-cols-[76px_30px_minmax(0,1fr)] items-center gap-3 py-3.5">
      <span className="relative block aspect-square overflow-hidden rounded-xl bg-[#f3f4f6]">
        {cardPart(builder, "image", product.image
          ? <Image src={product.image.src} alt={product.image.alt} fill sizes="76px" className="object-cover transition duration-300 group-hover:scale-105" />
          : <span className="grid h-full place-items-center text-slate-300"><ShoppingBag size={25} strokeWidth={1.4} /></span>)}
      </span>
      {builder ? <BuilderPart section={builder.section} id="rank" hidden={builder.hiddenParts.includes("rank")} editable={builder.editable} className="contents">{badge}</BuilderPart> : badge}
      <span className="min-w-0">
        {cardPart(builder, "name", <strong className="line-clamp-2 block text-xs leading-6 text-[#42495a] transition group-hover:text-[var(--brand-primary)]">{product.name}</strong>)}
        <small className="mt-1 block truncate text-[10px] text-[#9298a2]">{product.category}{cardPart(builder, "price", <> · {product.price}</>)}</small>
      </span>
    </Link>
  );
}
