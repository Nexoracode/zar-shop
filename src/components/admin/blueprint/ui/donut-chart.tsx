"use client";

import { useEffect, useRef, useState } from "react";
import { BpChartTip, type BpChartTipAnchor } from "./chart-tip";

export type BpDonutSlice = { label: string; value: number; color: string };

const SIZE = 160;
const THICKNESS = 22;
const RADIUS = (SIZE - THICKNESS) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Each slice's dash length plus where it starts, built with a running total carried through
 * `reduce`'s own accumulator rather than a mutated outer variable — this runs during render, and
 * React's compiler flags reassigning a render-scoped variable across iterations. */
function layoutSlices(data: BpDonutSlice[], total: number) {
  return data.reduce<{ slice: BpDonutSlice; dash: number; dashOffset: number; cumulative: number; start: number; fraction: number }[]>((rows, slice) => {
    const previousCumulative = rows.length ? rows[rows.length - 1].cumulative : 0;
    const fraction = slice.value / total;
    const dash = fraction * CIRCUMFERENCE;
    return [...rows, { slice, dash, dashOffset: -previousCumulative * CIRCUMFERENCE, cumulative: previousCumulative + fraction, start: previousCumulative, fraction }];
  }, []);
}

/**
 * A minimal inline-SVG donut chart, same no-library reasoning as `BpLineChart`. Hovering a slice —
 * or its row in the legend — swells that slice, dims the rest and opens the shared chart card
 * (`BpChartTip`) beside the slice's midpoint on the ring. A touch tap on a slice toggles it.
 */
export function BpDonutChart({ data, ariaLabel, centerLabel = "سفارش", categoryLabel = "دسته" }: { data: BpDonutSlice[]; ariaLabel: string; /** The word under the total in the ring's centre, and the name of the count in the card. */ centerLabel?: string; /** The label in front of the hovered slice's name in the card's heading. */ categoryLabel?: string }) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const segments = layoutSlices(data, total);

  const [hover, setHover] = useState<{ index: number; anchor: BpChartTipAnchor } | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  function focusSlice(index: number) {
    const svg = svgRef.current;
    const segment = segments[index];
    if (!svg || !segment) return;
    const box = svg.getBoundingClientRect();
    const angle = (segment.start + segment.fraction / 2) * 2 * Math.PI - Math.PI / 2;
    const x = box.left + ((SIZE / 2 + RADIUS * Math.cos(angle)) / SIZE) * box.width;
    const y = box.top + ((SIZE / 2 + RADIUS * Math.sin(angle)) / SIZE) * box.height;
    const reach = (THICKNESS / 2 + 3) * (box.height / SIZE);
    setHover({ index, anchor: { left: x - reach, right: x + reach, top: y - reach, bottom: y + reach } });
  }

  // A tap elsewhere puts the card away on touch screens, where nothing else would.
  useEffect(() => {
    if (!hover) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && holderRef.current?.contains(event.target)) return;
      setHover(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [hover]);

  const active = hover ? segments[hover.index] : null;
  const percent = (value: number) => Math.round((value / total) * 100).toLocaleString("fa-IR");
  const enter = (index: number) => (event: { pointerType: string }) => { if (event.pointerType !== "touch") focusSlice(index); };
  const leave = (event: { pointerType: string }) => { if (event.pointerType !== "touch") setHover(null); };

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div ref={holderRef} className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg ref={svgRef} viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label={ariaLabel} className="block overflow-visible">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--bp-divider)" strokeWidth={THICKNESS} />
          {segments.map(({ slice, dash, dashOffset }, index) => (
            <circle
              key={slice.label}
              className="bp-donut-slice"
              data-hot={hover?.index === index}
              data-dim={hover !== null && hover.index !== index}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={slice.color}
              strokeWidth={THICKNESS}
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              onPointerEnter={enter(index)}
              onPointerLeave={leave}
              onPointerDown={(event) => { if (event.pointerType === "touch") { if (hover?.index === index) setHover(null); else focusSlice(index); } }}
            />
          ))}
          <text x={SIZE / 2} y={SIZE / 2 - 4} textAnchor="middle" className="pointer-events-none fill-[var(--bp-text)]" style={{ font: "700 20px var(--bp-font)" }}>{total.toLocaleString("fa-IR")}</text>
          <text x={SIZE / 2} y={SIZE / 2 + 16} textAnchor="middle" className="pointer-events-none fill-[var(--bp-muted)]" style={{ font: "400 11px var(--bp-font)" }}>{centerLabel}</text>
        </svg>
        {hover && active && (
          <BpChartTip
            containerRef={holderRef}
            anchor={hover.anchor}
            content={{
              headingLabel: categoryLabel,
              heading: active.slice.label,
              rows: [
                { label: centerLabel, value: active.slice.value.toLocaleString("fa-IR"), color: active.slice.color },
                { label: "سهم", value: `${percent(active.slice.value)}٪`, color: active.slice.color },
              ],
            }}
          />
        )}
      </div>
      <ul className="m-0 grid w-full min-w-0 list-none gap-1 p-0">
        {data.map((slice, index) => (
          <li
            key={slice.label}
            className="bp-donut-row flex items-center justify-between gap-2 rounded-md px-1.5 py-0.5 text-[12px]"
            data-hot={hover?.index === index}
            onPointerEnter={enter(index)}
            onPointerLeave={leave}
          >
            <span className="flex min-w-0 items-center gap-2"><i aria-hidden className="block size-2.5 shrink-0 rounded-full" style={{ background: slice.color }} /><span className="truncate">{slice.label}</span></span>
            <span className="bp-muted shrink-0">{slice.value.toLocaleString("fa-IR")} ({percent(slice.value)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
