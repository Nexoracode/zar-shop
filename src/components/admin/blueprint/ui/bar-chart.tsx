"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { compactNumber, niceCeil } from "@/lib/chart-scale";

export type BpBarSeries = { key: string; label: string; color: string };
export type BpBarChartPoint = { label: string; values: Record<string, number> };

const GRID_LINES = 4;
const TIP_GAP = 10;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * A grouped bar chart drawn with plain elements — no charting library, same reasoning as
 * `BpLineChart`. The plot is laid out left→right oldest→newest (`dir="ltr"` on the plot only, as
 * a time axis reads that way in the line chart too) while every label keeps its own RTL text.
 * Bars are HTML rather than SVG so their rounded tops keep their shape at any width.
 *
 * Hovering a column lights it up, swells its bars and opens a card that names the category and
 * lists each series with its colour and value. The card belongs to this chart rather than to the
 * panel-wide tooltip layer: it has to appear at once, follow the pointer from column to column,
 * and carry the series colours. A touch tap toggles it, since there is no hover.
 */
export function BpBarChart({ data, series, ariaLabel, height = 220, categoryLabel = "تاریخ" }: { data: BpBarChartPoint[]; series: BpBarSeries[]; ariaLabel: string; height?: number; /** The label in front of the hovered category in the card's heading. */ categoryLabel?: string }) {
  const peak = Math.max(0, ...data.flatMap((point) => series.map((item) => point.values[item.key] ?? 0)));
  const ceiling = niceCeil(peak);
  const ticks = Array.from({ length: GRID_LINES + 1 }, (_, index) => (ceiling / GRID_LINES) * (GRID_LINES - index));
  // Thin the day labels out on narrow charts but always keep the first and last one.
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  const [active, setActive] = useState<number | null>(null);
  const [tip, setTip] = useState<{ left: number; top: number } | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Array<HTMLDivElement | null>>([]);
  const tipRef = useRef<HTMLDivElement>(null);

  // Positioned before paint, so the card is never seen at a stale spot. It sits centred above the
  // tallest bar of the hovered column; when that bar reaches the top and leaves no room, it goes
  // beside the column instead, on whichever side has the space.
  useLayoutEffect(() => {
    if (active === null) return;
    const plot = plotRef.current;
    const column = columnRefs.current[active];
    const card = tipRef.current;
    const point = data[active];
    if (!plot || !column || !card || !point) return;
    const plotBox = plot.getBoundingClientRect();
    const columnBox = column.getBoundingClientRect();
    const width = card.offsetWidth;
    const cardHeight = card.offsetHeight;
    const tallest = Math.max(0, ...series.map((item) => point.values[item.key] ?? 0));
    const barTop = plotBox.height - (tallest / ceiling) * plotBox.height;
    const centre = columnBox.left - plotBox.left + columnBox.width / 2;
    let left = centre - width / 2;
    let top = barTop - cardHeight - TIP_GAP;
    if (top < 0) {
      top = 0;
      left = centre > plotBox.width / 2 ? columnBox.left - plotBox.left - width - TIP_GAP : columnBox.right - plotBox.left + TIP_GAP;
    }
    setTip({ left: clamp(left, 0, plotBox.width - width), top });
  }, [active, data, series, ceiling]);

  // A tap elsewhere puts the card away on touch screens, where nothing else would.
  useEffect(() => {
    if (active === null) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && plotRef.current?.contains(event.target)) return;
      setActive(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [active]);

  const hovered = active !== null ? data[active] : null;

  return (
    <div role="img" aria-label={ariaLabel} className="w-full" dir="ltr">
      <div className="flex gap-2" style={{ height }}>
        <div className="relative w-9 shrink-0" aria-hidden>
          {ticks.map((tick, index) => (
            <span key={index} className="bp-muted absolute right-0 -translate-y-1/2 text-[10px] leading-none" style={{ top: `${(index / GRID_LINES) * 100}%` }}>{compactNumber(tick)}</span>
          ))}
        </div>
        <div ref={plotRef} className="relative min-w-0 flex-1">
          {ticks.map((_, index) => (
            <span key={index} className="absolute inset-x-0 border-t border-dashed border-[var(--bp-divider)]" style={{ top: `${(index / GRID_LINES) * 100}%` }} aria-hidden />
          ))}
          <div className="absolute inset-0 flex items-end justify-between gap-1" onPointerLeave={(event) => { if (event.pointerType !== "touch") setActive(null); }}>
            {data.map((point, index) => (
              <div
                key={point.label}
                ref={(node) => { columnRefs.current[index] = node; }}
                className="relative flex h-full min-w-0 flex-1 items-end justify-center gap-[3px]"
                onPointerEnter={(event) => { if (event.pointerType !== "touch") setActive(index); }}
                onPointerDown={(event) => { if (event.pointerType === "touch") setActive((current) => (current === index ? null : index)); }}
              >
                <span className="bp-bar-band" data-on={active === index} aria-hidden />
                {series.map((item) => {
                  const value = point.values[item.key] ?? 0;
                  return <span key={item.key} className="bp-bar relative w-full max-w-[16px]" data-hot={active === index} style={{ height: `${(value / ceiling) * 100}%`, background: `linear-gradient(180deg, ${item.color}, color-mix(in srgb, ${item.color} 55%, transparent))` }} />;
                })}
              </div>
            ))}
          </div>
          {hovered && (
            <div ref={tipRef} dir="rtl" className="bp-chart-tip" style={{ left: tip?.left ?? 0, top: tip?.top ?? 0, visibility: tip ? undefined : "hidden" }}>
              <div className="bp-chart-tip-head"><span className="bp-chart-tip-muted">{categoryLabel}:</span><strong>{hovered.label}</strong></div>
              <div className="bp-chart-tip-rule" aria-hidden />
              {series.map((item) => (
                <div key={item.key} className="bp-chart-tip-row">
                  <span className="bp-chart-tip-key"><i aria-hidden className="bp-chart-tip-dot" style={{ background: item.color }} />{item.label}:</span>
                  <strong style={{ color: item.color }}>{(hovered.values[item.key] ?? 0).toLocaleString("fa-IR")}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-1.5 flex gap-2">
        <span className="w-9 shrink-0" aria-hidden />
        <div className="flex min-w-0 flex-1 justify-between gap-1">
          {data.map((point, index) => {
            const isEdge = index === 0 || index === data.length - 1;
            const visible = isEdge || index % labelStep === 0;
            return <span key={point.label} dir="rtl" aria-hidden className={`bp-muted min-w-0 flex-1 truncate text-center text-[10px] ${visible ? "" : "invisible"}`}>{point.label}</span>;
          })}
        </div>
      </div>
      <ul className="m-0 mt-3 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-[11px]" dir="rtl">
        {series.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5"><i aria-hidden className="block size-2.5 shrink-0 rounded-full" style={{ background: item.color }} /><span className="bp-muted">{item.label}</span></li>
        ))}
      </ul>
    </div>
  );
}
