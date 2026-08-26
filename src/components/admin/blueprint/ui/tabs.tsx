"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A tab strip that scrolls sideways once the tabs outgrow it, instead of wrapping to a second
 * line or stretching the card that holds it.
 *
 * The arrows are the only sign that there is more to see — the scrollbar is hidden — so they
 * appear only while the strip actually overflows and each one disables itself at its end.
 */
export function BpTabs({ label, children }: { label: string; children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    // RTL scrollLeft counts down from zero, so distance-from-each-edge is read in absolutes.
    const offset = Math.abs(element.scrollLeft);
    const max = element.scrollWidth - element.clientWidth;
    setOverflow({ start: offset > 1, end: max - offset > 1 });
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure, children]);

  function scrollBy(direction: 1 | -1) {
    scrollRef.current?.scrollBy({ left: direction * Math.round((scrollRef.current.clientWidth || 200) * 0.7), behavior: "smooth" });
  }

  const scrollable = overflow.start || overflow.end;

  return (
    <div className="bp-tabs-scroller">
      {scrollable && (
        <button type="button" className="bp-tabs-arrow" aria-label="تب‌های قبلی" disabled={!overflow.start} onClick={() => scrollBy(1)}>
          <ChevronRight size={15} />
        </button>
      )}
      <div ref={scrollRef} className="bp-tabs-scroll" onScroll={measure}>
        <div className="bp-tabs" role="tablist" aria-label={label}>{children}</div>
      </div>
      {scrollable && (
        <button type="button" className="bp-tabs-arrow" aria-label="تب‌های بعدی" disabled={!overflow.end} onClick={() => scrollBy(-1)}>
          <ChevronLeft size={15} />
        </button>
      )}
    </div>
  );
}
