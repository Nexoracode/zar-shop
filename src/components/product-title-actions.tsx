"use client";

import { toast } from "@heroui/react";
import { Share2 } from "lucide-react";
import { useState } from "react";
import { ProductFavoriteButton } from "@/components/product-favorite-button";

const shareButtonClass = "grid size-8 place-items-center text-slate-700 transition hover:text-[var(--brand-primary)]";
// Only strips the shared favorite button's own circle chrome (size/background) — its
// hover-to-red stays, since that's the meaningful "favorited" affordance, not decoration.
const favoriteButtonClass = "!size-8 !min-h-8 !min-w-8 !bg-transparent";

/** The small favorite + share icons Digikala places right beside the brand/breadcrumb line above
 * the title — not the bigger rail of gallery-specific actions (compare, price alert, specs jump)
 * that stays next to the gallery image. */
export function ProductTitleActions({ productId, productName, initialFavorite }: { productId: string; productName: string; initialFavorite: boolean }) {
  const [sharing, setSharing] = useState(false);

  async function shareProduct() {
    if (sharing) return;
    setSharing(true);
    try {
      const shareData = { title: productName, url: window.location.href };
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(window.location.href);
      toast.success("لینک محصول آماده اشتراک‌گذاری شد");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.danger("اشتراک‌گذاری انجام نشد");
    } finally {
      setSharing(false);
    }
  }

  return <div className="flex items-center gap-1">
    <ProductFavoriteButton productId={productId} initialFavorite={initialFavorite} className={favoriteButtonClass} />
    <button type="button" onClick={() => void shareProduct()} aria-label="اشتراک‌گذاری محصول" className={shareButtonClass}>
      <Share2 size={18} />
    </button>
  </div>;
}
