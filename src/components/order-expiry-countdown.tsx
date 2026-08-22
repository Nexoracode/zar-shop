"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Chip } from "@heroui/react";

const noopSubscribe = () => () => undefined;

function remainingLabel(milliseconds: number) {
  if (milliseconds <= 0) return "مهلت پرداخت پایان یافته";
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `مهلت پرداخت: ${minutes.toLocaleString("fa-IR")}:${seconds.toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}`;
}

export function OrderExpiryCountdown({ expiresAt, warningMinutes, className = "", onExpired }: { expiresAt: string; warningMinutes: number; className?: string; onExpired?: () => void }) {
  const [remaining, setRemaining] = useState(() => new Date(expiresAt).getTime() - Date.now());
  // `remaining` is computed from Date.now() at both server-render and client-hydration
  // time, so the two disagree by however long that gap takes; gating the rendered text
  // behind `hydrated` (false during SSR and the client's first pass) keeps the initial
  // markup identical on both sides instead of racing a real timestamp against itself.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
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
  const urgent = hydrated && remaining <= warningMinutes * 60_000;
  return <Chip size="sm" variant="soft" className={`${className} ${urgent ? "text-[var(--danger)]" : "text-[var(--brand-accent)]"}`}><Chip.Label>{hydrated ? remainingLabel(remaining) : " "}</Chip.Label></Chip>;
}
