"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => undefined;

function splitRemaining(milliseconds: number) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

const pad = (value: number) => value.toLocaleString("fa-IR", { minimumIntegerDigits: 2, useGrouping: false });

function Cell({ value }: { value: string }) {
  return <span className="grid size-[26px] shrink-0 place-items-center rounded-[4px] bg-white text-[13px] font-bold tabular-nums text-[var(--foreground)]">{value}</span>;
}

/**
 * The countdown in the "شگفت‌انگیز" section header — time left until the soonest product in the
 * strip stops being discounted. Matches Digikala's own widget: opaque white chips (readable
 * regardless of the panel's background) rather than a labelled block. `DiscountExpiryRefresh`
 * reloads the section when it hits zero.
 */
export function FlashSaleCountdown({ endsAt, className = "" }: { endsAt: string; className?: string }) {
  const [remaining, setRemaining] = useState(() => new Date(endsAt).getTime() - Date.now());
  // Server render and client hydration read `Date.now()` a moment apart; gate the real digits
  // behind `hydrated` so the first client pass matches the server markup, then let the interval
  // take over. Same guard as `OrderExpiryCountdown`.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    const update = () => setRemaining(new Date(endsAt).getTime() - Date.now());
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  if (hydrated && remaining <= 0) return null;
  const { days, hours, minutes, seconds } = splitRemaining(remaining);

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
