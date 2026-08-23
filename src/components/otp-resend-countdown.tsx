"use client";

import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { LoadingLabel } from "@/components/loading-label";

const RESEND_SECONDS = 60;

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const clock = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return clock.replace(/[0-9]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

export function OtpResendCountdown({ onResend, isResending = false }: { onResend: () => void; isResending?: boolean }) {
  const [remaining, setRemaining] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  if (remaining > 0) {
    return <p className="m-0 text-center text-xs text-[#9a9fa8]" dir="ltr">{formatClock(remaining)} <span dir="rtl">مانده تا دریافت مجدد کد</span></p>;
  }

  return (
    <Button type="button" variant="ghost" fullWidth isPending={isResending} onPress={onResend} className="min-h-10 rounded-lg text-xs font-bold text-[var(--brand-accent)]">
      {({ isPending }) => <LoadingLabel isPending={isPending}>ارسال دوباره کد</LoadingLabel>}
    </Button>
  );
}
