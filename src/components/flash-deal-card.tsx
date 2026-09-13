import Image from "next/image";
import Link from "next/link";
import type { StorefrontProductCardItem } from "@/modules/products/storefront-feed-contract";

type Props = StorefrontProductCardItem & {
  /** Only the outer ends of the horizontal strip round; every card in between stays flat so the row reads as one continuous surface, matching Digikala's own flash-deal widget. */
  roundedSide?: "right" | "left" | "none";
};

const roundedClasses: Record<NonNullable<Props["roundedSide"]>, string> = {
  right: "rounded-r-md",
  left: "rounded-l-md",
  none: "",
};

/**
 * Compact product card for the "شگفت‌انگیز" flash-deal strip only — deliberately not the shared
 * `ProductCard` (used for normal grids/rails), since this widget's shape (114/164px square image,
 * 2-line title, discount pill beside the struck-through price) is a one-off layout unique to this
 * section, mirroring the same relationship Digikala's own homepage has to its normal product card.
 */
export function FlashDealCard({ href, name, discountPercent, price, originalPrice, image, roundedSide = "none" }: Props) {
  return (
    <Link href={href} className={`flex h-full min-w-[114px] shrink-0 flex-col justify-between overflow-hidden bg-white p-2 transition hover:bg-[#fafafa] sm:min-w-[164px] ${roundedClasses[roundedSide]}`}>
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-[var(--surface-tertiary)]">
        {image && <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1024px) 164px, 114px" className="object-contain" />}
      </div>
      <p className="m-0 mt-2 line-clamp-2 h-10 text-[12px] font-bold leading-[18px] text-[var(--foreground)]">{name}</p>
      <div className="mt-1">
        <div className="flex items-center gap-1">
          {discountPercent !== undefined && discountPercent > 0 && <span className="flex h-4 shrink-0 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-[var(--danger-foreground)]">٪{discountPercent.toLocaleString("fa-IR")}</span>}
          {originalPrice && <span className="truncate text-[11px] text-[var(--muted)] line-through">{originalPrice}</span>}
        </div>
        <div className="mt-0.5 truncate text-[16px] font-bold text-[var(--foreground)]">{price}</div>
      </div>
    </Link>
  );
}
