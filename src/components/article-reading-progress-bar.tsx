"use client";

import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { ChevronUp } from "lucide-react";

const SIZE = 48;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Fixed circular reading-progress ring on the page's left edge; the button inside scrolls back to top. */
export function ArticleReadingProgressBar({ contentId }: { contentId: string }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      const element = document.getElementById(contentId);
      if (!element) return;
      const winH = window.innerHeight;
      const elTop = element.getBoundingClientRect().top + window.scrollY;
      const total = element.offsetHeight - winH * 0.6;
      const pct = total > 0 ? ((window.scrollY - elTop + winH * 0.6) / total) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, pct)));
      setVisible(window.scrollY > 400);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [contentId]);

  const offset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <div
      className="fixed left-4 top-1/2 z-[60] size-12 transition-[opacity,transform] duration-300 ease-out sm:left-6"
      style={{ opacity: visible ? 1 : 0, transform: `translateY(-50%) scale(${visible ? 1 : 0.7})`, pointerEvents: visible ? "auto" : "none" }}
    >
      <svg aria-hidden width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="pointer-events-none absolute inset-0 -rotate-90 drop-shadow-[0_6px_18px_rgba(0,0,0,0.14)]">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="var(--surface)" stroke="var(--border)" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--brand-accent)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 150ms linear" }}
        />
      </svg>
      <Button
        type="button"
        isIconOnly
        variant="ghost"
        aria-label={`بازگشت به بالای مقاله (${Math.round(progress)} درصد مطالعه شده)`}
        onPress={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="absolute inset-0 size-full min-h-0 min-w-0 rounded-full border-0 bg-transparent text-[var(--brand-accent)] hover:bg-[color-mix(in_srgb,var(--brand-accent)_10%,transparent)]"
      >
        <ChevronUp size={19} />
      </Button>
    </div>
  );
}
