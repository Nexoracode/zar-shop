"use client";

import { useEffect, useState } from "react";
import { Button, Spinner } from "@heroui/react";

const RESEND_SECONDS = 60;

export function OtpResendCountdown({ onResend, isResending = false }: { onResend: () => void; isResending?: boolean }) {
  const [remaining, setRemaining] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  if (remaining > 0) {
    return <p className="m-0 text-center text-xs text-[#9a9fa8]">ارسال دوباره کد تا {remaining.toLocaleString("fa-IR")} ثانیه دیگر</p>;
  }

  return (
    <Button type="button" variant="ghost" fullWidth isPending={isResending} onPress={onResend} className="min-h-10 text-xs font-bold text-[var(--brand-accent)]">
      {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال ارسال..." : "ارسال دوباره کد"}</>}
    </Button>
  );
}
