"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";

export const CART_UPDATED_EVENT = "storefront:cart-updated";

export function notifyCartUpdated(count: number) {
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: { count } }));
}

export function StorefrontCartLink({ initialCount, className = "", iconSize = 21, mobile = false }: { initialCount: number; className?: string; iconSize?: number; mobile?: boolean }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const update = (event: Event) => {
      const next = (event as CustomEvent<{ count?: number }>).detail?.count;
      if (typeof next === "number") setCount(Math.max(0, next));
    };
    window.addEventListener(CART_UPDATED_EVENT, update);
    return () => window.removeEventListener(CART_UPDATED_EVENT, update);
  }, []);

  return (
    <Link href="/cart" aria-label={`سبد خرید، ${count.toLocaleString("fa-IR")} کالا`} className={`relative ${className}`}>
      <ShoppingCart size={iconSize} strokeWidth={1.7} />
      {count > 0 && <span className={`absolute grid min-w-5 place-items-center rounded-md bg-[var(--brand-primary)] px-1 text-[10px] font-black leading-5 text-[var(--brand-primary-foreground)] ${mobile ? "right-[calc(50%-20px)] top-1" : "-right-1 -top-1"}`}>{Math.min(count, 99).toLocaleString("fa-IR")}{count > 99 ? "+" : ""}</span>}
      {mobile && <small className="sr-only">سبد خرید</small>}
    </Link>
  );
}
