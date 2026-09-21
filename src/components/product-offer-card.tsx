import Image from "next/image";
import Link from "next/link";
import { FlashSaleCountdown } from "@/components/flash-sale-countdown";
import { ProductOfferCartButton } from "@/components/product-offer-cart-button";
import { cardPart, type ProductCardBuilder } from "@/components/product-card";
import type { StorefrontProductCardItem } from "@/modules/products/storefront-feed-contract";

/**
 * The product card of the feature-slider look: a header with "amazing offer" and the time left (for a product whose
 * discount has an end), the picture in a bordered frame, the category and brand, the name, the prices with the discount
 * and an "add to cart" button that ends the card. `reserveTop` keeps the header's space on the cards of a row that have no
 * offer, so the pictures line up. Every piece is a switchable part of the section (`card.*`).
 */
export function ProductOfferCard({ product, builder, reserveTop }: { product: StorefrontProductCardItem; builder?: ProductCardBuilder; reserveTop: boolean }) {
  const meta = [product.category, product.brand].filter(Boolean).join(" • ");
  return (
    <div className="flex h-full min-w-0 flex-col text-right">
      {reserveTop && (
        <div className="mb-2 min-h-9">
          {product.discountEndsAt && cardPart(builder, "countdown", (
            <div className="flex items-center justify-between gap-2 border-b-2 border-[var(--danger)] pb-1.5">
              <span className="text-[0.72rem] font-bold text-[var(--danger)]">پیشنهاد شگفت‌انگیز</span>
              <FlashSaleCountdown endsAt={product.discountEndsAt} tone="plain" />
            </div>
          ))}
        </div>
      )}
      <Link href={product.href} className="flex min-h-0 flex-1 flex-col">
        {cardPart(builder, "image", (
          <span className="relative block aspect-[100/85] shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-[var(--surface-tertiary)]">
            {product.image && <Image src={product.image.src} alt={product.image.alt} fill sizes="(min-width: 640px) 220px, 45vw" className="object-cover" />}
          </span>
        ))}
        {meta && cardPart(builder, "category", <span className="mt-2 block truncate text-[0.68rem] text-slate-400">{meta}</span>)}
        {cardPart(builder, "name", <h3 className="m-0 mt-1 line-clamp-2 min-h-10 text-[0.8rem] font-medium leading-5 text-slate-800">{product.name}</h3>)}
        <div className="mt-auto grid gap-0.5 pt-2">
          {cardPart(builder, "originalPrice", product.originalPrice ? <span className="block text-[0.7rem] text-slate-400 line-through">{product.originalPrice}</span> : <span aria-hidden="true" className="invisible block text-[0.7rem]">بدون تخفیف</span>)}
          <div className="flex items-center justify-between gap-2">
            {cardPart(builder, "price", <strong className="text-[0.85rem] font-bold text-slate-900">{product.price}</strong>)}
            {cardPart(builder, "badge", product.discountPercent ? <span className="rounded-md bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-1.5 py-0.5 text-[0.68rem] font-bold text-[var(--danger)]">٪{product.discountPercent.toLocaleString("fa-IR")}</span> : null)}
          </div>
        </div>
      </Link>
      {cardPart(builder, "cart", <ProductOfferCartButton productId={product.id} href={product.href} />)}
    </div>
  );
}
