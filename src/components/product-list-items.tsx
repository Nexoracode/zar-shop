import Image from "next/image";
import Link from "next/link";
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
