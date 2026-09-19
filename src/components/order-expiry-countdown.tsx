"use client";

import { useEffect, useRef, useState } from "react";
import { Chip } from "@heroui/react";
import { TriangleAlert } from "lucide-react";

function remainingLabel(milliseconds: number) {
  if (milliseconds <= 0) return "مهلت پرداخت پایان یافته";
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `مهلت پرداخت: ${minutes.toLocaleString("fa-IR")}:${seconds.toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}`;
}

function remainingSentence(milliseconds: number) {
  if (milliseconds <= 0) return "مهلت پرداخت این سفارش به پایان رسیده است.";
  const minutesLeft = Math.max(1, Math.ceil(milliseconds / 60_000));
  return `سفارش در صورت عدم پرداخت تا ${minutesLeft.toLocaleString("fa-IR")} دقیقه دیگر لغو خواهد شد.`;
}

export function OrderExpiryCountdown({ expiresAt, warningMinutes, className = "", onExpired, variant = "chip" }: { expiresAt: string; warningMinutes: number; className?: string; onExpired?: () => void; variant?: "chip" | "sentence" }) {
  // The clock is only read inside the effect, never while rendering: a `Date.now()` during render
  // differs between the server, the prerender and hydration (and Next refuses to prerender it), so
  // the first pass renders no time at all and the interval fills it in once mounted.
  const [remaining, setRemaining] = useState<number | null>(null);
  const expirationReported = useRef(false);
  useEffect(() => {
    const update = () => setRemaining(new Date(expiresAt).getTime() - Date.now());
    expirationReported.current = false;
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);
  useEffect(() => {
    if (remaining === null || remaining > 0 || expirationReported.current) return;
    expirationReported.current = true;
    onExpired?.();
  }, [onExpired, remaining]);
  const urgent = remaining !== null && remaining <= warningMinutes * 60_000;
  if (variant === "sentence") return <span className={`inline-flex items-center gap-1.5 text-xs font-bold text-[var(--warning)] ${className}`}><TriangleAlert size={15} className="shrink-0 text-[var(--warning)]" />{remaining !== null ? remainingSentence(remaining) :" "}</span>;
  return <Chip size="sm" variant="soft" className={`${className} ${urgent ? "text-[var(--danger)]" : "text-[var(--brand-accent)]"}`}><Chip.Label>{remaining !== null ? remainingLabel(remaining) :" "}</Chip.Label></Chip>;
}
