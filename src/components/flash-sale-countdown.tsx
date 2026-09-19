"use client";

import { useEffect, useState } from "react";

export function splitRemaining(milliseconds: number) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

export const pad = (value: number) => value.toLocaleString("fa-IR", { minimumIntegerDigits: 2, useGrouping: false });

function Cell({ value }: { value: string }) {
  return <span className="grid size-[26px] shrink-0 place-items-center rounded-[4px] bg-white text-[13px] font-bold tabular-nums text-[var(--foreground)]">{value}</span>;
}

/**
 * Milliseconds until `endsAt`, ticking every second — or null until the component has mounted. The clock
 * is only read inside the effect, never while rendering: a `Date.now()` during render is a different
 * value on the server, in the prerender and after hydration (Next refuses to prerender it).
 */
export function useRemainingMs(endsAt: string) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setRemaining(new Date(endsAt).getTime() - Date.now());
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [endsAt]);
  return remaining;
}

/**
 * The countdown in the "شگفت‌انگیز" section header — time left until the soonest product in the
 * strip stops being discounted. Matches Digikala's own widget: opaque white chips (readable
 * regardless of the panel's background) rather than a labelled block. `DiscountExpiryRefresh`
 * reloads the section when it hits zero.
 */
export function FlashSaleCountdown({ endsAt, className = "" }: { endsAt: string; className?: string }) {
  // The first pass shows zeroed digits on every side and the interval takes over once mounted.
  // Same approach as `OrderExpiryCountdown`.
  const remaining = useRemainingMs(endsAt);
  const hydrated = remaining !== null;

  if (remaining !== null && remaining <= 0) return null;
  const { days, hours, minutes, seconds } = splitRemaining(remaining ?? 0);

  return (
    <div className={`flex items-center gap-[2px] ${className}`} dir="ltr" aria-label="زمان باقی‌مانده تا پایان پیشنهاد">
      {hydrated && days > 0 && (
        <>
          <Cell value={days.toLocaleString("fa-IR")} />
          <span className="w-1 text-center text-[13px] font-bold text-[var(--brand-primary-foreground)]">:</span>
        </>
      )}
      <Cell value={hydrated ? pad(hours) : "۰۰"} />
      <span className="w-1 text-center text-[13px] font-bold text-[var(--brand-primary-foreground)]">:</span>
      <Cell value={hydrated ? pad(minutes) : "۰۰"} />
      <span className="w-1 text-center text-[13px] font-bold text-[var(--brand-primary-foreground)]">:</span>
      <Cell value={hydrated ? pad(seconds) : "۰۰"} />
    </div>
  );
}
