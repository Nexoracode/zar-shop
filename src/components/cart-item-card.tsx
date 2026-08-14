"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Spinner, toast } from "@heroui/react";
import { Minus, Plus, ShieldCheck, Trash2, Truck } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { notifyCartUpdated } from "@/components/storefront-cart-link";

type Props = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  imageAlt: string;
  quantity: number;
  maxQuantity: number;
  optionSummary: string[];
  weight: string | null;
  unitPrice: number;
  originalUnitPrice: number | null;
  currency: "IRR" | "IRT";
  preparationDays: number;
};

export function CartItemCard({ id, name, slug, imageUrl, imageAlt, quantity, maxQuantity, optionSummary, weight, unitPrice, originalUnitPrice, currency, preparationDays }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function mutate(nextQuantity?: number) {
    setPending(true);
    try {
      const response = await fetch(nextQuantity === undefined ? `/api/cart?itemId=${encodeURIComponent(id)}` : "/api/cart", {
        method: nextQuantity === undefined ? "DELETE" : "PATCH",
        headers: nextQuantity === undefined ? undefined : { "Content-Type": "application/json" },
        body: nextQuantity === undefined ? undefined : JSON.stringify({ cartItemId: id, quantity: nextQuantity }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "به‌روزرسانی سبد خرید انجام نشد.");
      notifyCartUpdated(result.itemCount ?? 0);
      router.refresh();
    } catch (error) {
      toast.danger("سبد خرید به‌روزرسانی نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="grid gap-4 border-b border-[var(--border)] p-4 last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)] sm:p-5">
      <Link href={`/products/${slug}`} className="relative mx-auto block size-36 overflow-hidden rounded-xl bg-[var(--surface-secondary)] sm:mx-0">
        {imageUrl ? <Image src={imageUrl} alt={imageAlt} fill sizes="144px" className="object-contain p-2" /> : <span className="grid size-full place-items-center text-xs text-[var(--muted)]">بدون تصویر</span>}
      </Link>
      <div className="min-w-0">
        <Link href={`/products/${slug}`} className="line-clamp-2 text-sm font-black leading-7 text-[var(--foreground)] sm:text-base">{name}</Link>
        <div className="mt-3 grid gap-2 text-xs text-[var(--muted)]">
          {optionSummary.map((option) => <span key={option}>{option}</span>)}
          {weight && <span>وزن: {weight}</span>}
          <span className="flex items-center gap-2"><ShieldCheck size={16} />ضمانت اصالت و سلامت کالا</span>
          <span className="flex items-center gap-2"><Truck size={16} />آماده‌سازی تا {preparationDays.toLocaleString("fa-IR")} روز کاری</span>
        </div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div className="inline-flex h-11 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <Button type="button" isIconOnly variant="ghost" size="sm" isDisabled={pending || quantity >= maxQuantity} aria-label={`افزایش تعداد ${name}`} onPress={() => void mutate(quantity + 1)} className="size-10 min-h-10 min-w-10 text-[var(--brand-primary)]"><Plus size={16} /></Button>
            <span className="grid min-w-8 place-items-center text-sm font-black text-[var(--brand-primary)]">{pending ? <Spinner size="sm" /> : quantity.toLocaleString("fa-IR")}</span>
            <Button type="button" isIconOnly variant="ghost" size="sm" isDisabled={pending} aria-label={quantity === 1 ? `حذف ${name}` : `کاهش تعداد ${name}`} onPress={() => void mutate(quantity === 1 ? undefined : quantity - 1)} className="size-10 min-h-10 min-w-10 text-[var(--brand-primary)]">{quantity === 1 ? <Trash2 size={16} /> : <Minus size={16} />}</Button>
          </div>
          <div className="text-left">
            {originalUnitPrice !== null && originalUnitPrice > unitPrice && <span className="mb-1 block text-xs text-[var(--muted)] line-through">{formatMoney(originalUnitPrice * quantity, currency)}</span>}
            <strong className="block text-base font-black text-[var(--foreground)]">{formatMoney(unitPrice * quantity, currency)}</strong>
            {quantity > 1 && <small className="mt-1 block text-[var(--muted)]">هر عدد {formatMoney(unitPrice, currency)}</small>}
          </div>
        </div>
      </div>
    </article>
  );
}
