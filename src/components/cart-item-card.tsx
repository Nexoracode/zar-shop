"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@heroui/react";
import { Minus, Plus, ShieldCheck, Trash2, Truck } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { useCartLine } from "@/components/cart-live";

type Props = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  imageAlt: string;
  maxQuantity: number;
  optionSummary: string[];
  weight: string | null;
  unitPrice: number;
  originalUnitPrice: number | null;
  currency: "IRR" | "IRT";
  preparationDays: number;
};

export function CartItemCard({ id, name, slug, imageUrl, imageAlt, maxQuantity, optionSummary, weight, unitPrice, originalUnitPrice, currency, preparationDays }: Props) {
  // The quantity comes from the page-level provider, which shows a click at once and keeps the totals in step (0 = removed).
  const { quantity: shownQuantity, mutate: mutateLine } = useCartLine(id);
  const [pendingAction, setPendingAction] = useState<"increase" | "decrease" | null>(null);
  const pending = pendingAction !== null;

  async function mutate(nextQuantity: number | undefined, action: "increase" | "decrease") {
    setPendingAction(action);
    try {
      await mutateLine(nextQuantity);
    } finally {
      setPendingAction(null);
    }
  }

  if (shownQuantity === 0) return null;

  return (
    <article className="grid gap-4 border-b border-[var(--border)] p-4 last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)] sm:p-5">
      <Link href={`/products/${slug}`} className="relative mx-auto block size-36 overflow-hidden rounded-xl bg-[var(--surface-secondary)] sm:mx-0">
        {imageUrl ? <Image src={imageUrl} alt={imageAlt} fill sizes="144px" className="object-contain p-2" /> : <span className="grid size-full place-items-center text-xs text-[var(--muted)]">بدون تصویر</span>}
      </Link>
      <div className="min-w-0">
        <Link href={`/products/${slug}`} className="line-clamp-2 text-sm font-bold leading-7 text-[var(--foreground)] sm:text-base">{name}</Link>
        <div className="mt-3 grid gap-2 text-xs text-[var(--muted)]">
          {optionSummary.map((option) => <span key={option}>{option}</span>)}
          {weight && <span>وزن: {weight}</span>}
          <span className="flex items-center gap-2"><ShieldCheck size={16} />ضمانت اصالت و سلامت کالا</span>
          <span className="flex items-center gap-2"><Truck size={16} />آماده‌سازی تا {preparationDays.toLocaleString("fa-IR")} روز کاری</span>
        </div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div className="inline-flex h-11 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <Button type="button" isIconOnly variant="ghost" size="sm" isPending={pendingAction === "increase"} isDisabled={pending || shownQuantity >= maxQuantity} aria-label={`افزایش تعداد ${name}`} onPress={() => void mutate(shownQuantity + 1, "increase")} className="size-10 min-h-10 min-w-10 text-[var(--brand-primary)]"><Plus size={16} /></Button>
            <span className="grid min-w-8 place-items-center text-sm font-bold text-[var(--brand-primary)]">{shownQuantity.toLocaleString("fa-IR")}</span>
            <Button type="button" isIconOnly variant="ghost" size="sm" isPending={pendingAction === "decrease"} isDisabled={pending} aria-label={shownQuantity === 1 ? `حذف ${name}` : `کاهش تعداد ${name}`} onPress={() => void mutate(shownQuantity === 1 ? undefined : shownQuantity - 1, "decrease")} className="size-10 min-h-10 min-w-10 text-[var(--brand-primary)]">{shownQuantity === 1 ?<Trash2 size={16} /> : <Minus size={16} />}</Button>
          </div>
          <div className="text-left">
            {originalUnitPrice !== null && originalUnitPrice > unitPrice && <span className="mb-1 block text-xs text-[var(--muted)] line-through">{formatMoney(originalUnitPrice * shownQuantity, currency)}</span>}
            <strong className="block text-base font-bold text-[var(--foreground)]">{formatMoney(unitPrice * shownQuantity, currency)}</strong>
            {shownQuantity > 1 && <small className="mt-1 block text-[var(--muted)]">هر عدد {formatMoney(unitPrice, currency)}</small>}
          </div>
        </div>
      </div>
    </article>
  );
}
