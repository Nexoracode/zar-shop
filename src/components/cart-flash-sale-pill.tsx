"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BadgePercent } from "lucide-react";
import { pad, splitRemaining, useRemainingMs } from "@/components/flash-sale-countdown";

/**
 * "شگفت‌انگیز" pill above a cart line, with the time left on the sale. When the clock reaches zero
 * the page is refreshed so the line settles on its real price instead of keeping the sale's.
 */
export function CartFlashSalePill({ endsAt }: { endsAt: string }) {
  const router = useRouter();
  const remaining = useRemainingMs(endsAt);
  const ended = remaining !== null && remaining <= 0;

  useEffect(() => {
    if (ended) router.refresh();
  }, [ended, router]);

  if (ended) return null;
  const { days, hours, minutes, seconds } = splitRemaining(remaining ?? 0);
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full px-3 py-1 text-[11px] font-bold text-[var(--danger)]" style={{ backgroundColor: "color-mix(in srgb, var(--danger) 10%, white)" }}>
      <span className="inline-flex items-center gap-1"><BadgePercent size={14} />شگفت‌انگیز</span>
      {remaining !== null && (
        <span className="inline-flex items-center gap-1.5 tabular-nums" aria-label="زمان باقی‌مانده تا پایان پیشنهاد">
          {days > 0 && <span>{days.toLocaleString("fa-IR")} روز</span>}
          <bdi dir="ltr">{pad(hours)} : {pad(minutes)} : {pad(seconds)}</bdi>
        </span>
      )}
    </span>
  );
}
