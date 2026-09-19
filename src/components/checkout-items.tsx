import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { InlineAlert } from "@/components/inline-alert";
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
  /** No longer for sale: shown so the customer is not surprised, but not counted or charged. */
  unavailable?: boolean;
};

/**
 * The cart's contents on the checkout page, so the customer confirms what they are paying for
 * without going back. Presentational only: prices arrive worked out by the server.
 */
export function CheckoutItems({ items, currency, editHref }: { items: CheckoutItem[]; currency: "IRR" | "IRT"; /** Where the cart can still be edited; omitted once the order is already placed. */ editHref?: string }) {
  const count = items.reduce((sum, item) => sum + (item.unavailable ? 0 : item.quantity), 0);
  return (
    <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <Card.Content className="p-5">
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
        <ul className="m-0 grid list-none gap-0 p-0">
          {items.map((item) => {
            const image = (
              <span className={`relative block size-16 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-secondary)] sm:size-[72px] ${item.unavailable ? "opacity-50 grayscale" : ""}`}>
                {item.imageUrl ? <Image src={item.imageUrl} alt={item.imageAlt} fill sizes="72px" className="object-contain p-1" /> : <span className="grid size-full place-items-center text-[10px] text-[var(--muted)]">بدون تصویر</span>}
              </span>
            );
            const name = <span className="line-clamp-2 text-[13px] font-bold leading-6 text-[var(--foreground)]">{item.name}</span>;
            return (
              <li key={item.id} data-unavailable={item.unavailable || undefined} className="flex items-center gap-3 border-b border-[var(--border)] py-3 first:pt-0 last:border-b-0 last:pb-0">
                {item.slug ? <Link href={`/products/${item.slug}`} className="shrink-0">{image}</Link> : image}
                <div className="min-w-0 flex-1">
                  {item.slug ? <Link href={`/products/${item.slug}`}>{name}</Link> : name}
                  {item.optionSummary.length > 0 && <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[var(--muted)]">{item.optionSummary.map((option) => <span key={option}>{option}</span>)}</div>}
                  {item.unavailable && <InlineAlert compact status="danger" className="mt-2">دیگر موجود نیست و در این سفارش حساب نمی‌شود.</InlineAlert>}
                  <span className="mt-1.5 inline-flex rounded-md bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] font-bold text-[var(--muted)]">{item.quantity.toLocaleString("fa-IR")} عدد</span>
                </div>
                {item.unavailable ? <strong className="shrink-0 text-[13px] font-bold text-[var(--danger)]">ناموجود</strong> : (
                  <div className="shrink-0 text-left">
                    {item.originalUnitPrice !== null && item.originalUnitPrice > item.unitPrice && <span className="block text-[11px] text-[var(--muted)] line-through">{formatMoney(item.originalUnitPrice * item.quantity, currency)}</span>}
                    <strong className="block text-[13px] font-bold">{formatMoney(item.unitPrice * item.quantity, currency)}</strong>
                    {item.quantity > 1 && <small className="mt-0.5 block text-[11px] text-[var(--muted)]">هر عدد {formatMoney(item.unitPrice, currency)}</small>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card.Content>
    </Card>
  );
}
