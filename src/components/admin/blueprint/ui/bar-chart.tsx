"use client";

import { useEffect, useRef, useState } from "react";
import { compactNumber, niceCeil } from "@/lib/chart-scale";
import { BpChartTip, type BpChartTipAnchor } from "./chart-tip";

export type BpBarSeries = { key: string; label: string; color: string };
export type BpBarChartPoint = { label: string; values: Record<string, number> };

const GRID_LINES = 4;

/**
 * A grouped bar chart drawn with plain elements — no charting library, same reasoning as
 * `BpLineChart`. The plot is laid out left→right oldest→newest (`dir="ltr"` on the plot only, as
 * a time axis reads that way in the line chart too) while every label keeps its own RTL text.
 * Bars are HTML rather than SVG so their rounded tops keep their shape at any width.
 *
 * Hovering a column lights it up, swells its bars and opens the shared chart card (`BpChartTip`)
 * above its tallest bar. A touch tap toggles it, since there is no hover.
 */
export function BpBarChart({ data, series, ariaLabel, height = 220, categoryLabel = "تاریخ" }: { data: BpBarChartPoint[]; series: BpBarSeries[]; ariaLabel: string; height?: number; /** The label in front of the hovered category in the card's heading. */ categoryLabel?: string }) {
  const peak = Math.max(0, ...data.flatMap((point) => series.map((item) => point.values[item.key] ?? 0)));
  const ceiling = niceCeil(peak);
  const ticks = Array.from({ length: GRID_LINES + 1 }, (_, index) => (ceiling / GRID_LINES) * (GRID_LINES - index));
  // Thin the day labels out on narrow charts but always keep the first and last one.
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  const [hover, setHover] = useState<{ index: number; anchor: BpChartTipAnchor } | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  function focusColumn(index: number, column: HTMLElement) {
    const plot = plotRef.current;
    if (!plot) return;
    const plotBox = plot.getBoundingClientRect();
    const columnBox = column.getBoundingClientRect();
    const tallest = Math.max(0, ...series.map((item) => data[index].values[item.key] ?? 0));
    const barTop = plotBox.top + plotBox.height - (tallest / ceiling) * plotBox.height;
    setHover({ index, anchor: { left: columnBox.left, right: columnBox.right, top: barTop, bottom: columnBox.bottom } });
  }

  // A tap elsewhere puts the card away on touch screens, where nothing else would.
  useEffect(() => {
    if (!hover) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && plotRef.current?.contains(event.target)) return;
      setHover(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [hover]);

  const active = hover ? data[hover.index] : null;

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
          <div className="absolute inset-0 flex items-end justify-between gap-1" onPointerLeave={(event) => { if (event.pointerType !== "touch") setHover(null); }}>
            {data.map((point, index) => (
              <div
                key={point.label}
                className="relative flex h-full min-w-0 flex-1 items-end justify-center gap-[3px]"
                onPointerEnter={(event) => { if (event.pointerType !== "touch") focusColumn(index, event.currentTarget); }}
                onPointerDown={(event) => { if (event.pointerType === "touch") { if (hover?.index === index) setHover(null); else focusColumn(index, event.currentTarget); } }}
              >
                <span className="bp-bar-band" data-on={hover?.index === index} aria-hidden />
                {series.map((item) => {
                  const value = point.values[item.key] ?? 0;
                  return <span key={item.key} className="bp-bar relative w-full max-w-[16px]" data-hot={hover?.index === index} style={{ height: `${(value / ceiling) * 100}%`, background: `linear-gradient(180deg, ${item.color}, color-mix(in srgb, ${item.color} 55%, transparent))` }} />;
                })}
              </div>
            ))}
          </div>
          {hover && active && (
            <BpChartTip
              containerRef={plotRef}
              anchor={hover.anchor}
              content={{ headingLabel: categoryLabel, heading: active.label, rows: series.map((item) => ({ label: item.label, value: (active.values[item.key] ?? 0).toLocaleString("fa-IR"), color: item.color })) }}
            />
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
