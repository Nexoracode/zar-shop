"use client";

import { toast } from "@heroui/react";
import { Check, Scale } from "lucide-react";
import { useCompare } from "@/components/compare-provider";
import type { CompareItem } from "@/modules/compare/compare";

type Props = {
  item: CompareItem;
  /** `detail` — labelled button on the product page. `icon` — round toggle for a card corner. */
  variant?: "detail" | "icon";
  className?: string;
};

export function CompareButton({ item, variant = "detail", className = "" }: Props) {
  const { has, toggle } = useCompare();
  const active = has(item.id);

  function onToggle() {
    const nowIn = toggle(item);
    // `toggle` shows its own rejection toast; only confirm the moves that actually happened.
    if (nowIn) toast.success("به فهرست مقایسه اضافه شد");
    else if (active) toast.success("از فهرست مقایسه حذف شد");
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-pressed={active}
        aria-label={active ? "حذف از مقایسه" : "افزودن به مقایسه"}
        title={active ? "حذف از مقایسه" : "افزودن به مقایسه"}
        onClick={onToggle}
        className={`grid size-8 place-items-center rounded-full border transition ${active ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "border-slate-200 bg-white/90 text-slate-500 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"} ${className}`}
      >
        {active ? <Check size={15} /> : <Scale size={15} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 text-xs font-bold transition ${active ? "border-[var(--brand-primary)] bg-[color-mix(in_srgb,var(--brand-primary)_8%,white)] text-[var(--brand-primary)]" : "border-slate-200 text-slate-600 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"} ${className}`}
    >
      {active ? <Check size={16} /> : <Scale size={16} />}
      {active ? "در فهرست مقایسه" : "افزودن به مقایسه"}
    </button>
  );
}
