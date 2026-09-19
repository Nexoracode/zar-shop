"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

/**
 * One line of the card: a label (with a colour dot when `color` is given) and either a value, in
 * that colour, or a run of `swatches` — the named colours of an option, each with its own dot.
 * A swatch without `color` is listed as plain text.
 */
export type BpChartTipRow = {
  label: string;
  value?: string;
  color?: string;
  swatches?: Array<{ label: string; color?: string }>;
  /** A muted line under the row — the date range of a discount, say. */
  note?: string;
  /** Turns the row into a small heading that starts a new group under a rule; only `label` is used. */
  section?: boolean;
};
export type BpChartTipContent = { headingLabel: string; heading: string; rows: BpChartTipRow[] };
/** The hovered mark's box in viewport pixels — what `getBoundingClientRect()` gives. */
export type BpChartTipAnchor = { left: number; right: number; top: number; bottom: number };

const GAP = 10;
const MARGIN = 6;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/** The card's contents — heading, a rule, then the rows. Shared by the chart card and the hover card of table flags. */
export function BpTipCardBody({ content }: { content: BpChartTipContent }) {
  return (
    <>
      <div className="bp-chart-tip-head"><span className="bp-chart-tip-muted">{content.headingLabel}:</span><strong>{content.heading}</strong></div>
      <div className="bp-chart-tip-rule" aria-hidden />
      {content.rows.map((row, index) => row.section ? (
        <div key={`${row.label}-${index}`} className="bp-chart-tip-section">{row.label}</div>
      ) : (
        <div key={`${row.label}-${index}`}>
          <div className="bp-chart-tip-row" data-stack={row.swatches ? "true" : undefined}>
            <span className="bp-chart-tip-key">{row.color && <i aria-hidden className="bp-chart-tip-dot" style={{ background: row.color }} />}{row.label}:</span>
            {row.swatches ? (
              <span className="bp-chart-tip-swatches">
                {row.swatches.map((swatch) => (
                  <span key={swatch.label} className="bp-chart-tip-swatch">
                    {swatch.color && <i aria-hidden style={{ background: swatch.color }} />}
                    {swatch.label}
                  </span>
                ))}
              </span>
            ) : <strong style={row.color ? { color: row.color } : undefined}>{row.value}</strong>}
          </div>
          {row.note && <div className="bp-chart-tip-note">{row.note}</div>}
        </div>
      ))}
    </>
  );
}

/**
 * The card every Blueprint chart opens on hover: a heading naming the mark ("تاریخ: ۲۱ شهریور"),
 * a rule, then one row per figure with its colour dot, label and a value in that colour.
 *
 * It is placed inside `containerRef` (which must be `position: relative`) and never leaves the
 * surrounding panel: centred above the mark, or — when there is no room above — beside it, on
 * whichever side has more. It positions itself before paint from `anchor`, so it is never seen at a
 * stale spot, and glides when the anchor moves to the next mark. Charts hand it `anchor` and
 * `content` from their hover handlers, so nothing here reads the clock or the pointer.
 */
export function BpChartTip({ content, anchor, containerRef }: { content: BpChartTipContent; anchor: BpChartTipAnchor; containerRef: RefObject<HTMLElement | null> }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  // Off for the first placement, on afterwards — see `.bp-chart-tip[data-glide]` in the CSS.
  const [glide, setGlide] = useState(false);

  useEffect(() => {
    if (!position || glide) return;
    const frame = window.requestAnimationFrame(() => setGlide(true));
    return () => window.cancelAnimationFrame(frame);
  }, [position, glide]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    const container = containerRef.current;
    if (!card || !container) return;
    const origin = container.getBoundingClientRect();
    const bounds = (container.closest(".bp-frame") ?? container).getBoundingClientRect();
    const minX = bounds.left - origin.left + MARGIN;
    const maxX = bounds.right - origin.left - MARGIN;
    const minY = bounds.top - origin.top + MARGIN;
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    const markLeft = anchor.left - origin.left;
    const markRight = anchor.right - origin.left;
    const markTop = anchor.top - origin.top;
    const centre = (markLeft + markRight) / 2;
    let left = centre - width / 2;
    let top = markTop - height - GAP;
    if (top < minY) {
      top = Math.max(minY, markTop);
      left = centre > (minX + maxX) / 2 ? markLeft - width - GAP : markRight + GAP;
    }
    setPosition({ left: clamp(left, minX, maxX - width), top });
  }, [anchor, content, containerRef]);

  return (
    <div ref={cardRef} dir="rtl" className="bp-chart-tip" data-glide={glide} style={{ left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? undefined : "hidden" }}>
      <BpTipCardBody content={content} />
    </div>
  );
}
