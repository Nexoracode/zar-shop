import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Card } from "@heroui/react";
import { formatMoney } from "@/lib/format";

/** One line of the order being placed, already priced. */
export type CheckoutItem = {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string | null;
  imageAlt: string;
  quantity: number;
  optionSummary: string[];
  unitPrice: number;
  originalUnitPrice: number | null;
};

/**
 * The cart's contents on the checkout page, under the order summary, so the customer confirms what
 * they are paying for without going back. Presentational only: prices arrive worked out by the server.
 */
export function CheckoutItems({ items, currency, editHref }: { items: CheckoutItem[]; currency: "IRR" | "IRT"; /** Where the cart can still be edited; omitted once the order is already placed. */ editHref?: string }) {
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <Card variant="secondary" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <Card.Content className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><ShoppingBag size={18} /></span>
            <div className="min-w-0">
              <h2 className="m-0 text-base font-bold">اقلام سفارش</h2>
              <p className="mb-0 mt-1 text-xs text-[var(--muted)]">{count.toLocaleString("fa-IR")} کالا در این سفارش</p>
            </div>
          </div>
          {editHref && <Link href={editHref} className="text-xs font-bold text-[var(--brand-primary)] hover:underline">ویرایش سبد خرید</Link>}
        </div>
        {/* Sits in the narrow summary column, so it scrolls instead of pushing the pay button off screen. */}
        <ul className="m-0 grid max-h-[340px] list-none gap-0 overflow-y-auto p-0 pe-1">
          {items.map((item) => {
            const image = (
              <span className="relative block size-14 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-secondary)]">
                {item.imageUrl ? <Image src={item.imageUrl} alt={item.imageAlt} fill sizes="56px" className="object-contain p-1" /> : <span className="grid size-full place-items-center text-[10px] text-[var(--muted)]">بدون تصویر</span>}
              </span>
            );
            const name = <span className="line-clamp-2 text-[12px] font-bold leading-5 text-[var(--foreground)]">{item.name}</span>;
            return (
              <li key={item.id} className="flex items-start gap-3 border-b border-[var(--border)] py-3 first:pt-0 last:border-b-0 last:pb-0">
                {item.slug ? <Link href={`/products/${item.slug}`} className="shrink-0">{image}</Link> : image}
                <div className="min-w-0 flex-1">
                  {item.slug ? <Link href={`/products/${item.slug}`}>{name}</Link> : name}
                  {item.optionSummary.length > 0 && <div className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] text-[var(--muted)]">{item.optionSummary.map((option) => <span key={option}>{option}</span>)}</div>}
                  <div className="mt-1.5 flex items-end justify-between gap-2">
                    <span className="rounded-md bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] font-bold text-[var(--muted)]">{item.quantity.toLocaleString("fa-IR")} عدد</span>
                    <div className="text-left">
                      {item.originalUnitPrice !== null && item.originalUnitPrice > item.unitPrice && <span className="block text-[10px] text-[var(--muted)] line-through">{formatMoney(item.originalUnitPrice * item.quantity, currency)}</span>}
                      <strong className="block whitespace-nowrap text-[12px] font-bold">{formatMoney(item.unitPrice * item.quantity, currency)}</strong>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card.Content>
    </Card>
  );
}
