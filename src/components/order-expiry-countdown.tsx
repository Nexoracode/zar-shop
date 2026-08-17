"use client";

import { useEffect, useRef, useState } from "react";
import { Chip } from "@heroui/react";

function remainingLabel(milliseconds: number) {
  if (milliseconds <= 0) return "مهلت پرداخت پایان یافته";
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `مهلت پرداخت: ${minutes.toLocaleString("fa-IR")}:${seconds.toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}`;
}

export function OrderExpiryCountdown({ expiresAt, warningMinutes, className = "", onExpired }: { expiresAt: string; warningMinutes: number; className?: string; onExpired?: () => void }) {
  const [remaining, setRemaining] = useState(() => new Date(expiresAt).getTime() - Date.now());
  const expirationReported = useRef(false);
  useEffect(() => {
    const update = () => setRemaining(new Date(expiresAt).getTime() - Date.now());
    expirationReported.current = false;
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);
  useEffect(() => {
    if (remaining > 0 || expirationReported.current) return;
    expirationReported.current = true;
    onExpired?.();
  }, [onExpired, remaining]);
  return <Chip size="sm" variant="soft" className={`${className} ${remaining <= warningMinutes * 60_000 ? "text-[var(--danger)]" : "text-[var(--brand-accent)]"}`}><Chip.Label>{remainingLabel(remaining)}</Chip.Label></Chip>;
}
