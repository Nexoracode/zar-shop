"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { toast } from "@heroui/react";
import { BadgePercent, ChevronLeft } from "lucide-react";
import { Card } from "@/components/hero";
import { formatMoney } from "@/lib/format";
import { FreeShippingProgress } from "@/components/free-shipping-progress";
import { listenForCartUpdates, notifyCartUpdated } from "@/components/storefront-cart-link";

/** What the cart page knows about one line when the server rendered it. A null price means it could not be worked out. */
export type CartLiveLine = { id: string; quantity: number; finalPrice: number | null; originalPrice: number | null };

type CartLiveState = {
  quantityOf: (id: string) => number;
  itemCount: number;
  mutate: (id: string, nextQuantity: number | undefined) => Promise<void>;
  subtotal: number | null;
  merchandiseTotal: number | null;
};

const CartLiveContext = createContext<CartLiveState | null>(null);

function useCartLive() {
  const state = useContext(CartLiveContext);
  if (!state) throw new Error("Cart live components must be rendered inside CartLiveProvider.");
  return state;
}

/**
 * Owns the cart page's quantities so every figure derived from them — the line, the counts, the totals —
 * changes in the same instant a button is pressed. The server page only catches up once `router.refresh()`
 * lands, which can take seconds; while a request or that refresh is running the click's value is shown, and
 * afterwards the server's value takes over again.
 */
export function CartLiveProvider({ lines, children }: { lines: CartLiveLine[]; children: ReactNode }) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<Record<string, number>>({});
  const [inFlight, setInFlight] = useState(0);
  const [isRefreshing, startRefresh] = useTransition();
  const live = inFlight > 0 || isRefreshing;

  const mutate = useCallback(async (id: string, nextQuantity: number | undefined) => {
    // A settled earlier click must not linger and mask what the server now says about other lines.
    setOptimistic((current) => ({ ...(live ? current : {}), [id]: nextQuantity ?? 0 }));
    setInFlight((count) => count + 1);
    try {
      const response = await fetch(nextQuantity === undefined ? `/api/cart?itemId=${encodeURIComponent(id)}` : "/api/cart", {
        method: nextQuantity === undefined ? "DELETE" : "PATCH",
        headers: nextQuantity === undefined ? undefined : { "Content-Type": "application/json" },
        body: nextQuantity === undefined ? undefined : JSON.stringify({ cartItemId: id, quantity: nextQuantity }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "به‌روزرسانی سبد خرید انجام نشد.");
      notifyCartUpdated(result.itemCount ?? 0);
      startRefresh(() => router.refresh());
    } catch (error) {
      setOptimistic((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      toast.danger("سبد خرید به‌روزرسانی نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setInFlight((count) => count - 1);
    }
  }, [live, router]);

  // Another tab changed the cart: reload this page's lines from the server. Nothing of this tab's own is in
  // flight then, so its settled clicks must not linger over what the server now says.
  useEffect(() => listenForCartUpdates((detail) => {
    if (!detail.remote) return;
    if (!live) setOptimistic({});
    startRefresh(() => router.refresh());
  }), [live, router]);

  const shown = lines.map((line) => ({ ...line, quantity: live && line.id in optimistic ? optimistic[line.id] : line.quantity }));
  const present = shown.filter((line) => line.quantity > 0);
  const priceUnavailable = present.some((line) => line.finalPrice === null || line.originalPrice === null);
  const value: CartLiveState = {
    quantityOf: (id) => shown.find((line) => line.id === id)?.quantity ?? 0,
    itemCount: present.reduce((sum, line) => sum + line.quantity, 0),
    mutate,
    subtotal: priceUnavailable ? null : present.reduce((sum, line) => sum + line.originalPrice! * line.quantity, 0),
    merchandiseTotal: priceUnavailable ? null : present.reduce((sum, line) => sum + line.finalPrice! * line.quantity, 0),
  };

  return <CartLiveContext.Provider value={value}>{children}</CartLiveContext.Provider>;
}

/** The quantity of one line as it should be shown right now, and the action that changes it (undefined removes it). */
export function useCartLine(id: string) {
  const { quantityOf, mutate } = useCartLive();
  return { quantity: quantityOf(id), mutate: (nextQuantity: number | undefined) => mutate(id, nextQuantity) };
}

/** Just the number of items, for use inside the page's own wording. */
export function CartLiveCount() {
  return <>{useCartLive().itemCount.toLocaleString("fa-IR")}</>;
}

export function CartLiveHeadline() {
  const { itemCount } = useCartLive();
  return <>{itemCount ? `${itemCount.toLocaleString("fa-IR")} کالا در سبد خرید` : "هنوز کالایی انتخاب نکرده‌اید"}</>;
}

/** The order summary column: totals, checkout link and the free-shipping hint, all following the live quantities. */
export function CartLiveSummary({ currency, freeShippingThreshold }: { currency: "IRR" | "IRT"; freeShippingThreshold: number | null }) {
  const { itemCount, subtotal, merchandiseTotal } = useCartLive();
  if (subtotal === null || merchandiseTotal === null) return null;
  const productDiscount = subtotal - merchandiseTotal;

  return (
    <aside className="grid gap-4 lg:sticky lg:top-24">
      <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <dl className="m-0 grid gap-4 text-sm"><div className="flex items-center justify-between gap-4 text-[var(--muted)]"><dt>قیمت کالاها ({itemCount.toLocaleString("fa-IR")})</dt><dd>{formatMoney(subtotal, currency)}</dd></div>{productDiscount > 0 && <div className="flex items-center justify-between gap-4 font-bold text-[var(--danger)]"><dt>تخفیف کالاها</dt><dd>{formatMoney(productDiscount, currency)}</dd></div>}<div className="flex items-center justify-between gap-4 border-t border-[var(--border)] pt-4 font-bold"><dt>جمع سبد خرید</dt><dd>{formatMoney(merchandiseTotal, currency)}</dd></div></dl>
        <Link href="/checkout" className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-5 text-sm font-bold text-[var(--brand-primary-foreground)] shadow-sm transition hover:brightness-110">ادامه فرایند خرید<ChevronLeft size={18} /></Link>
        {freeShippingThreshold !== null && <div className="mt-5"><FreeShippingProgress merchandiseTotal={merchandiseTotal} threshold={freeShippingThreshold} currency={currency} /></div>}
        {productDiscount > 0 && <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-[var(--danger)]"><BadgePercent size={16} />{formatMoney(productDiscount, currency)} سود شما از تخفیف کالاها</div>}
      </Card>
    </aside>
  );
}
