"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BpTipCardBody, type BpChartTipContent } from "./chart-tip";

const OPEN_DELAY_MS = 90;
const GAP = 8;
const EDGE = 8;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Wraps a small marker — a tag, a swatch — and opens the Blueprint card (`BpTipCardBody`, the same
 * one the charts use) when it is hovered or keyboard-focused; a tap toggles it on touch screens.
 *
 * The card is portalled to `document.body` and positioned with `position: fixed`, because the
 * markers live in table cells whose scroll container would clip an absolutely positioned card. It
 * goes above the marker and flips below when there is no room, never leaving the viewport, and
 * closes on scroll, Escape, an outside press or when the pointer leaves. A click on the marker
 * never reaches the table row, so it cannot toggle the row's selection.
 */
export function BpHoverCard({ content, label, children, className = "" }: { content: BpChartTipContent; /** The marker's accessible name — what a screen reader says instead of the card. */ label: string; children: ReactNode; className?: string }) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  const show = (delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
    setPosition(null);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const card = cardRef.current;
    if (!trigger || !card) return;
    const rect = trigger.getBoundingClientRect();
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    const above = rect.top - EDGE >= height + GAP || rect.top >= window.innerHeight - rect.bottom;
    const top = above ? rect.top - height - GAP : rect.bottom + GAP;
    setPosition({ left: clamp(rect.left + rect.width / 2 - width / 2, EDGE, window.innerWidth - width - EDGE), top: clamp(top, EDGE, window.innerHeight - height - EDGE) });
  }, [open, content]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && triggerRef.current?.contains(event.target)) return;
      hide();
    }
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") hide(); }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", hide, { capture: true });
      window.removeEventListener("resize", hide);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        role="note"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        className={`inline-flex cursor-help outline-offset-2 ${className}`.trim()}
        onPointerEnter={(event) => { if (event.pointerType !== "touch") show(OPEN_DELAY_MS); }}
        onPointerLeave={(event) => { if (event.pointerType !== "touch") hide(); }}
        onPointerDown={(event) => { if (event.pointerType === "touch") { if (open) hide(); else show(0); } }}
        onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) show(0); }}
        onBlur={hide}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </span>
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={cardRef}
          id={id}
          role="tooltip"
          dir="rtl"
          // Declares `.bp-root` itself: the portal sits outside the shell, so the blueprint tokens
          // would not otherwise resolve for it. `position` is inline because `.bp-chart-tip` sets
          // `absolute`, which is right inside a chart panel but not here.
          className="bp-root bp-chart-tip"
          style={{ position: "fixed", zIndex: 300, left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? undefined : "hidden" }}
        >
          <BpTipCardBody content={content} />
        </div>,
        document.body,
      )}
    </>
  );
}
