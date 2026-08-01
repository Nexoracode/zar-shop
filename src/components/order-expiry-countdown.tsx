"use client";

import { useEffect, useState } from "react";
import { Chip } from "@heroui/react";

function remainingLabel(milliseconds: number) {
  if (milliseconds <= 0) return "مهلت پرداخت پایان یافته";
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `مهلت پرداخت: ${minutes.toLocaleString("fa-IR")}:${seconds.toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}`;
}

export function OrderExpiryCountdown({ expiresAt, warningMinutes }: { expiresAt: string; warningMinutes: number }) {
  const [remaining, setRemaining] = useState(() => new Date(expiresAt).getTime() - Date.now());
  useEffect(() => {
    const update = () => setRemaining(new Date(expiresAt).getTime() - Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);
  return <Chip size="sm" variant="soft" className={remaining <= warningMinutes * 60_000 ? "mt-1 text-[var(--brand-danger)]" : "mt-1 text-[var(--brand-accent)]"}><Chip.Label>{remainingLabel(remaining)}</Chip.Label></Chip>;
}
