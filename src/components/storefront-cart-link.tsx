"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Popover, Spinner, toast } from "@heroui/react";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";

export const CART_UPDATED_EVENT = "storefront:cart-updated";

type CartSummaryItem = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  imageAlt: string;
  quantity: number;
  maxQuantity: number;
  unitPrice: number;
  originalUnitPrice: number | null;
  discountPercent: number | null;
};

type CartSummary = {
  itemCount: number;
  items: CartSummaryItem[];
  subtotal: number | null;
  total: number | null;
  discount: number | null;
  currency: "IRR" | "IRT";
};

export function notifyCartUpdated(count: number) {
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: { count } }));
}

export function StorefrontCartLink({ initialCount, className = "", iconSize = 21, mobile = false }: { initialCount: number; className?: string; iconSize?: number; mobile?: boolean }) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [pendingItemAction, setPendingItemAction] = useState<"increase" | "decrease" | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerAreaRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const loadSummary = useCallback(async () => {
    if (count === 0) {
      setSummary(null);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/cart", { cache: "no-store" });
      const result = await response.json().catch(() => null) as CartSummary | { message?: string } | null;
      if (!response.ok) throw new Error(result && "message" in result ? result.message : "خلاصه سبد خرید دریافت نشد.");
      const nextSummary = result as CartSummary;
      setSummary(nextSummary);
      setCount(nextSummary.itemCount);
    } catch (error) {
      toast.danger("خلاصه سبد خرید دریافت نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setLoading(false);
    }
  }, [count]);

  useEffect(() => {
    const update = (event: Event) => {
      const next = (event as CustomEvent<{ count?: number }>).detail?.count;
      if (typeof next === "number") {
        setCount(Math.max(0, next));
        setSummary(null);
      }
    };
    window.addEventListener(CART_UPDATED_EVENT, update);
    return () => window.removeEventListener(CART_UPDATED_EVENT, update);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const containsPoint = (element: HTMLElement | null, x: number, y: number, tolerance = 0) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return x >= rect.left - tolerance
        && x <= rect.right + tolerance
        && y >= rect.top - tolerance
        && y <= rect.bottom + tolerance;
    };

    const cancelScheduledClose = () => {
      if (!closeTimer.current) return;
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    };

    const schedulePointerClose = () => {
      if (closeTimer.current) return;
      closeTimer.current = setTimeout(() => {
        closeTimer.current = null;
        setIsOpen(false);
      }, 260);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const isOverTrigger = containsPoint(triggerAreaRef.current, event.clientX, event.clientY, 4);
      const isOverContent = containsPoint(contentRef.current, event.clientX, event.clientY, 8);
      if (isOverTrigger || isOverContent) cancelScheduledClose();
      else schedulePointerClose();
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (triggerAreaRef.current?.contains(target) || contentRef.current?.contains(target)) return;
      cancelScheduledClose();
      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      cancelScheduledClose();
      setIsOpen(false);
    };

    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleEscape);
      cancelScheduledClose();
    };
  }, [isOpen]);

  function openPopover() {
    if (mobile || count === 0) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setIsOpen(true);
    if (!summary && !loading) void loadSummary();
  }

  function closePopover() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setIsOpen(false);
  }

  async function mutate(item: CartSummaryItem, nextQuantity: number | undefined, action: "increase" | "decrease") {
    setPendingItemId(item.id);
    setPendingItemAction(action);
    try {
      const response = await fetch(nextQuantity === undefined ? `/api/cart?itemId=${encodeURIComponent(item.id)}` : "/api/cart", {
        method: nextQuantity === undefined ? "DELETE" : "PATCH",
        headers: nextQuantity === undefined ? undefined : { "Content-Type": "application/json" },
        body: nextQuantity === undefined ? undefined : JSON.stringify({ cartItemId: item.id, quantity: nextQuantity }),
      });
      const result = await response.json().catch(() => null) as { itemCount?: number; message?: string } | null;
      if (!response.ok) throw new Error(result?.message ?? "به‌روزرسانی سبد خرید انجام نشد.");
      const nextCount = result?.itemCount ?? 0;
      setCount(nextCount);
      notifyCartUpdated(nextCount);
      setSummary(null);
      if (nextCount > 0) await loadSummary();
      else closePopover();
      router.refresh();
    } catch (error) {
      toast.danger("سبد خرید به‌روزرسانی نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setPendingItemId(null);
      setPendingItemAction(null);
    }
  }

  const badge = count > 0 && <span className={`absolute grid h-[18px] min-w-[18px] place-items-center rounded-[5px] border-2 border-white bg-[var(--brand-primary)] px-0.5 text-[9px] font-bold leading-none text-[var(--brand-primary-foreground)] ${mobile ? "right-[calc(50%-20px)] top-1" : "-bottom-0.5 -right-1"}`}>{Math.min(count, 99).toLocaleString("fa-IR")}{count > 99 ? "+" : ""}</span>;

  if (mobile) return (
    <Link href="/cart" aria-label={`سبد خرید، ${count.toLocaleString("fa-IR")} کالا`} className={`relative ${className}`}>
      <ShoppingCart size={iconSize} strokeWidth={1.7} />
      {badge}
      <small className="sr-only">سبد خرید</small>
    </Link>
  );

  return (
    <div ref={triggerAreaRef} onPointerEnter={openPopover} className="relative">
      <Link
        href="/cart"
        aria-label={`سبد خرید، ${count.toLocaleString("fa-IR")} کالا`}
        onClick={closePopover}
        className={`relative z-10 block cursor-pointer bg-transparent outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/30 ${className}`}
      >
        <ShoppingCart size={iconSize} strokeWidth={1.7} />
        {badge}
      </Link>
      <Popover isOpen={isOpen}>
        <Popover.Trigger
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        />
        <Popover.Content
          ref={contentRef}
          // Non-modal: react-aria's default modal Popover renders a full-viewport invisible
          // underlay while open, which swallows the very first click anywhere on the page
          // (including back on the trigger icon) just to dismiss itself. That breaks the
          // trigger's own <Link href="/cart"> — the click that should navigate gets consumed
          // closing the popover instead. This preview is hover-driven and this icon is a real
          // navigation link, so the rest of the page must stay clickable while it is open.
          isNonModal
          placement="bottom left"
          offset={8}
          dir="rtl"
          className="z-[200] w-[min(94vw,500px)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0 text-right text-[var(--foreground)] shadow-[0_10px_30px_rgba(15,23,42,.2)]"
        >
          <Popover.Dialog dir="rtl" className="p-0 text-right">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-4">
              <Popover.Heading className="m-0 text-base font-bold">خلاصه سبد خرید شما</Popover.Heading>
              <span className="text-xs text-[var(--muted)]">{count.toLocaleString("fa-IR")} کالا</span>
            </div>

            {loading && !summary ? <div className="grid min-h-44 place-items-center"><Spinner size="md" /></div> : summary?.items.length ? <>
              <div className="max-h-[310px] overflow-y-auto">
                {summary.items.map((item) => {
                  const pending = pendingItemId === item.id;
                  return <article key={item.id} className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 border-b border-[var(--border)] px-4 py-3 last:border-b-0">
                    <Link href={`/products/${item.slug}`} onClick={closePopover} className="relative block size-[76px] overflow-hidden rounded-lg bg-[var(--surface-secondary)]">
                      {item.imageUrl ? <Image src={item.imageUrl} alt={item.imageAlt} fill sizes="76px" className="object-contain p-1" /> : <span className="grid size-full place-items-center text-[10px] text-[var(--muted)]">بدون تصویر</span>}
                    </Link>
                    <div className="min-w-0">
                      <Link href={`/products/${item.slug}`} onClick={closePopover} className="line-clamp-2 text-xs font-bold leading-6 text-[var(--foreground)]">{item.name}</Link>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div className="inline-flex h-10 shrink-0 items-center rounded-full border border-[var(--border)] bg-[var(--surface)]">
                          <Button type="button" isIconOnly variant="ghost" size="sm" isPending={pending && pendingItemAction === "increase"} isDisabled={pending || item.quantity >= item.maxQuantity} aria-label={`افزایش تعداد ${item.name}`} onPress={() => void mutate(item, item.quantity + 1, "increase")} className="size-9 min-h-9 min-w-9 rounded-full text-[var(--brand-primary)]"><Plus size={16} /></Button>
                          <span className="grid min-w-7 place-items-center text-xs font-bold text-[var(--brand-primary)]">{item.quantity.toLocaleString("fa-IR")}</span>
                          <Button type="button" isIconOnly variant="ghost" size="sm" isPending={pending && pendingItemAction === "decrease"} isDisabled={pending} aria-label={item.quantity === 1 ? `حذف ${item.name}` : `کاهش تعداد ${item.name}`} onPress={() => void mutate(item, item.quantity === 1 ? undefined : item.quantity - 1, "decrease")} className="size-9 min-h-9 min-w-9 rounded-full text-[var(--brand-primary)]">{item.quantity === 1 ? <Trash2 size={15} /> : <Minus size={16} />}</Button>
                        </div>
                        <div className="text-left">
                          {item.originalUnitPrice !== null && item.originalUnitPrice > item.unitPrice && <div className="mb-1 flex items-center justify-end gap-2"><span className="rounded-full bg-[var(--danger)] px-2 py-0.5 text-[10px] font-bold text-white">{item.discountPercent?.toLocaleString("fa-IR")}٪</span><span className="text-[10px] text-[var(--muted)] line-through">{formatMoney(item.originalUnitPrice * item.quantity, summary.currency)}</span></div>}
                          <strong className="block whitespace-nowrap text-sm font-bold">{formatMoney(item.unitPrice * item.quantity, summary.currency)}</strong>
                        </div>
                      </div>
                    </div>
                  </article>;
                })}
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(170px,260px)] items-center gap-4 border-t border-[var(--border)] p-3">
                <div className="min-w-0 text-xs">
                  <span className="block text-[var(--muted)]">مبلغ قابل پرداخت</span>
                  <strong className="mt-1 block whitespace-nowrap text-sm font-bold">{summary.total === null ? "قیمت موقتاً در دسترس نیست" : formatMoney(summary.total, summary.currency)}</strong>
                  {summary.discount !== null && summary.discount > 0 && <span className="mt-1 block text-[10px] font-bold text-[var(--danger)]">{formatMoney(summary.discount, summary.currency)} سود شما از خرید</span>}
                </div>
                <Link href="/cart" onClick={closePopover} className="flex min-h-12 items-center justify-center rounded-lg bg-[var(--brand-primary)] px-5 text-sm font-bold text-[var(--brand-primary-foreground)] transition hover:brightness-105">ثبت سفارش</Link>
              </div>
            </> : <div className="grid min-h-40 place-items-center px-5 text-sm text-[var(--muted)]">سبد خرید شما خالی است.</div>}
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </div>
  );
}
