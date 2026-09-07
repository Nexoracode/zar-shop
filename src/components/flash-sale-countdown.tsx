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
  return <span className="min-w-[26px] rounded-md bg-white/15 px-1 py-1 text-center text-[13px] font-bold tabular-nums text-white">{value}</span>;
}

/**
 * The single countdown in the "پیشنهاد شگفت‌انگیز" section header — time left until the soonest
 * product in the strip stops being discounted. Sits on the brand-primary panel, so it is drawn
 * white-on-primary. `DiscountExpiryRefresh` reloads the section when it hits zero.
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
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <span className="text-[11px] font-bold text-white/85">تا پایان پیشنهاد</span>
      <div className="flex items-center gap-1" dir="ltr" aria-label="زمان باقی‌مانده تا پایان پیشنهاد">
        {hydrated && days > 0 && (
          <>
            <span className="min-w-[26px] rounded-md bg-white/15 px-1 py-1 text-center text-[13px] font-bold text-white">{days.toLocaleString("fa-IR")}</span>
            <span className="px-0.5 text-[11px] font-bold text-white/70">روز</span>
          </>
        )}
        <Cell value={hydrated ? pad(hours) : "۰۰"} />
        <span className="text-xs font-bold text-white/70">:</span>
        <Cell value={hydrated ? pad(minutes) : "۰۰"} />
        <span className="text-xs font-bold text-white/70">:</span>
        <Cell value={hydrated ? pad(seconds) : "۰۰"} />
      </div>
    </div>
  );
}
