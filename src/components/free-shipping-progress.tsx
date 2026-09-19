"use client";

import { ProgressBar } from "@heroui/react";
import { Gift, PartyPopper, Truck } from "lucide-react";
import { formatMoney } from "@/lib/format";

/**
 * How close the cart is to free shipping, as a bar that fills toward the threshold.
 *
 * The bar runs on the brand colours (primary into accent) so it belongs to whichever palette the
 * store picked; once the threshold is reached it switches to the semantic success colour, which is
 * a state rather than a brand choice. The truck rides the end of the fill.
 */
export function FreeShippingProgress({ merchandiseTotal, threshold, currency }: { merchandiseTotal: number; threshold: number; currency: "IRR" | "IRT" }) {
  const reached = merchandiseTotal >= threshold;
  const remaining = Math.max(0, threshold - merchandiseTotal);
  const percent = Math.min(100, Math.floor((merchandiseTotal / threshold) * 100));
  // Never show a full bar until it is earned, nor an empty one that hides the truck.
  const shown = reached ? 100 : Math.min(97, Math.max(4, percent));
  const near = !reached && percent >= 60;

  return (
    <div
      className={`free-ship rounded-xl border p-3.5 ${reached
        ? "border-[color-mix(in_srgb,var(--success)_35%,transparent)] bg-[color-mix(in_srgb,var(--success)_9%,transparent)]"
        : "border-[color-mix(in_srgb,var(--brand-primary)_22%,transparent)] bg-[color-mix(in_srgb,var(--brand-primary)_7%,transparent)]"}`}
      data-reached={reached}
    >
      <div className="flex items-center gap-2.5">
        <span className={`grid size-9 shrink-0 place-items-center rounded-full ${reached ? "bg-[var(--success)] text-white" : "bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]"}`}>
          {reached ? <PartyPopper size={18} /> : <Gift size={18} />}
        </span>
        <p className="m-0 min-w-0 flex-1 text-[13px] font-bold leading-6 text-[var(--foreground)]">
          {reached
            ? "تبریک! ارسال سفارش شما رایگان است"
            : <>فقط <span className="text-[var(--brand-primary)]">{formatMoney(remaining, currency)}</span> تا ارسال رایگان</>}
        </p>
        <span className={`shrink-0 text-xs font-bold tabular-nums ${reached ? "text-[var(--success)]" : "text-[var(--brand-primary)]"}`}>{percent.toLocaleString("fa-IR")}٪</span>
      </div>

      {/* The side padding is the truck's half width, so it can sit on either end without overflowing. */}
      <div className="relative mt-4 px-3.5">
        <ProgressBar aria-label="میزان نزدیکی به ارسال رایگان" value={shown} minValue={0} maxValue={100} className="w-full">
          <ProgressBar.Track className="h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]">
            <ProgressBar.Fill className="free-ship-fill h-full rounded-full transition-[width] duration-700 ease-out" />
          </ProgressBar.Track>
        </ProgressBar>
        <span
          aria-hidden="true"
          className={`free-ship-truck absolute top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full border-2 border-[var(--surface)] shadow-md transition-[inset-inline-start] duration-700 ease-out ${reached ? "bg-[var(--success)] text-white" : "bg-[var(--brand-accent)] text-[var(--brand-accent-foreground)]"}`}
          style={{ insetInlineStart: `calc(0.875rem + (100% - 1.75rem) * ${shown / 100})`, marginInlineStart: "-0.875rem" }}
        >
          <Truck size={14} />
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3 text-[11px] text-[var(--muted)]">
        <span>{near ? "کمی مانده؛ یک کالای دیگر اضافه کنید." : reached ? "بدون هزینه اضافه به دست شما می‌رسد." : "به ازای هر کالای بیشتر، به ارسال رایگان نزدیک‌تر می‌شوید."}</span>
        <span className="shrink-0">از {formatMoney(threshold, currency)}</span>
      </div>
    </div>
  );
}
