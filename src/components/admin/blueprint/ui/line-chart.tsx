"use client";

import { useId } from "react";
import { formatMoney } from "@/lib/format";

export type BpLineChartPoint = { label: string; value: number };

const WIDTH = 600;
const HEIGHT = 200;
const PADDING_X = 4;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 8;
const PLOT_WIDTH = WIDTH - PADDING_X * 2;
const PLOT_HEIGHT = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

/**
 * A minimal inline-SVG line chart — no charting library, matching the Blueprint rule against
 * pulling in a heavy dependency for what a plain element (here, a handful of SVG primitives)
 * already does. The viewBox is a fixed logical size and stretches to the container's width, so
 * dot markers get a hair of horizontal-only distortion at very narrow widths — imperceptible at
 * the radius used here.
 */
export function BpLineChart({ data, money = false, ariaLabel }: { data: BpLineChartPoint[]; /** Format each point's tooltip value as money instead of a plain number. */ money?: boolean; ariaLabel: string }) {
  const gradientId = useId();
  // A plain callback prop cannot cross from the server-rendered dashboard into this client
  // component, so the formatting choice travels as a flag instead.
  const format = money ? (value: number) => formatMoney(value) : (value: number) => value.toLocaleString("fa-IR");
  const values = data.map((point) => point.value);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = max - min || 1;
  const stepX = data.length > 1 ? PLOT_WIDTH / (data.length - 1) : 0;
  const points = data.map((point, index) => ({
    ...point,
    x: PADDING_X + stepX * index,
    y: PADDING_TOP + PLOT_HEIGHT - ((point.value - min) / range) * PLOT_HEIGHT,
  }));
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const floorY = PADDING_TOP + PLOT_HEIGHT;
  const areaPath = points.length > 1 ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${floorY} L ${points[0].x.toFixed(1)} ${floorY} Z` : "";
  // Every label would collide on 14+ points; thin them out but always keep the first and last.
  const labelStep = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} preserveAspectRatio="none" role="img" aria-label={ariaLabel}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--bp-accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--bp-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((ratio) => {
          const y = PADDING_TOP + PLOT_HEIGHT * ratio;
          return <line key={ratio} x1={PADDING_X} x2={WIDTH - PADDING_X} y1={y} y2={y} stroke="var(--bp-divider)" strokeWidth={1} />;
        })}
        {points.length > 1 && <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />}
        {points.length > 1 && <path d={linePath} fill="none" stroke="var(--bp-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((point) => (
          <circle key={point.label} cx={point.x} cy={point.y} r={3} fill="var(--bp-card)" stroke="var(--bp-accent)" strokeWidth={2}>
            <title>{`${point.label}: ${format(point.value)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1.5 flex justify-between">
        {points.map((point, index) => {
          const isEdge = index === 0 || index === points.length - 1;
          if (!isEdge && index % labelStep !== 0) return <span key={point.label} aria-hidden />;
          return <span key={point.label} className="bp-muted text-[10px]">{point.label}</span>;
        })}
      </div>
    </div>
  );
}
