"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EllipsisVertical, MessageCircleQuestion, Share2, X } from "lucide-react";
import { Popover, toast } from "@heroui/react";
import { StorefrontSearch } from "@/components/storefront-search";
import { StorefrontCartLink } from "@/components/storefront-cart-link";

const iconButtonClass = "grid size-10 place-items-center rounded-lg text-slate-700 outline-none transition hover:bg-[var(--surface-tertiary)]";

/** Digikala replaces the whole storefront chrome (top header + bottom nav) with a single
 * compact bar on the product page — close, search, cart, more — instead of stacking its own
 * header/footer navigation on top of the product content. AppChrome renders this instead of
 * <StorefrontHeader> for `/products/[slug]`. */
export function ProductDetailTopBar({ productName, cartCount }: { productName: string; cartCount: number }) {
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  function close() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  async function shareProduct() {
    try {
      const shareData = { title: productName, url: window.location.href };
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(window.location.href);
      toast.success("لینک محصول آماده اشتراک‌گذاری شد");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.danger("اشتراک‌گذاری انجام نشد");
    }
  }

  return <header data-product-top-bar className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-2 lg:hidden" dir="rtl">
    <button type="button" onClick={close} aria-label="بستن" className={iconButtonClass}><X size={22} /></button>
    <div className="flex items-center gap-1">
      <StorefrontSearch className={iconButtonClass} />
      <StorefrontCartLink initialCount={cartCount} mobile iconSize={22} className={`relative ${iconButtonClass}`} />
      <Popover isOpen={moreOpen} onOpenChange={setMoreOpen}>
        <Popover.Trigger aria-label="گزینه‌های بیشتر" className={`cursor-pointer ${iconButtonClass}`}><EllipsisVertical size={22} /></Popover.Trigger>
        <Popover.Content placement="bottom left" dir="rtl" className="z-[190] w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 text-right text-[var(--foreground)] shadow-[0_10px_35px_rgba(15,23,42,.18)]">
          <Popover.Dialog dir="rtl" className="p-0 text-right">
            <button type="button" onClick={() => { setMoreOpen(false); void shareProduct(); }} className="flex min-h-12 w-full items-center gap-3 border-b border-[var(--border)] px-4 text-sm font-bold text-slate-700 transition hover:text-[var(--brand-primary)]"><Share2 size={18} />اشتراک‌گذاری محصول</button>
            <Link href="/pages/contact" onClick={() => setMoreOpen(false)} className="flex min-h-12 items-center gap-3 px-4 text-sm font-bold text-slate-700 transition hover:text-[var(--brand-primary)]"><MessageCircleQuestion size={18} />تماس با پشتیبانی</Link>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </div>
  </header>;
}
