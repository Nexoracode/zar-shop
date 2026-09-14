"use client";

import { useEffect, useState } from "react";

/** Fixed top bar; percent = how far the reader has scrolled through `contentId`'s element. */
export function ArticleReadingProgressBar({ contentId }: { contentId: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const element = document.getElementById(contentId);
      if (!element) return;
      const winH = window.innerHeight;
      const elTop = element.getBoundingClientRect().top + window.scrollY;
      const total = element.offsetHeight - winH * 0.6;
      const pct = total > 0 ? ((window.scrollY - elTop + winH * 0.6) / total) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, pct)));
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [contentId]);

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-[3px] bg-[var(--border)]">
      <div className="h-full bg-[var(--brand-accent)] transition-[width]" style={{ width: `${progress}%` }} />
    </div>
  );
}
