"use client";

import { useEffect, useRef, useState } from "react";
import { IRAN_MAP_ATTRIBUTION, IRAN_MAP_VIEW_BOX, IRAN_PROVINCE_SHAPES } from "@/data/iran-provinces";
import { mapIntensity, placeProvinces } from "@/lib/iran-map";
import { BpChartTip, type BpChartTipAnchor } from "./chart-tip";

export type BpProvinceMapDatum = { province: string; value: number; valueLabel: string; hint?: string };

const LABELLED_PROVINCES = 5;

/**
 * A choropleth of Iran's provinces drawn from plain SVG paths — no mapping library. Each
 * province is shaded by its share of the busiest one; the biggest few are named on the map.
 * Hovering a province swells it, outlines it in the accent colour and opens the shared chart card
 * (`BpChartTip`) with its figures. Figures that match no province (for example an address with no
 * province) are listed underneath instead of being silently left out.
 */
export function BpProvinceMap({ data, ariaLabel }: { data: BpProvinceMapDatum[]; ariaLabel: string }) {
  const { placed, unplaced } = placeProvinces(data);
  const peak = Math.max(0, ...[...placed.values()].map((entry) => entry.value));
  const labelled = new Set([...placed.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, LABELLED_PROVINCES).map(([name]) => name));

  const [hover, setHover] = useState<{ name: string; anchor: BpChartTipAnchor } | null>(null);
  const figureRef = useRef<HTMLElement>(null);

  // A tap elsewhere puts the card away on touch screens, where nothing else would.
  useEffect(() => {
    if (!hover) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && figureRef.current?.contains(event.target)) return;
      setHover(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [hover]);

  function focusShape(name: string, shape: Element) {
    const box = shape.getBoundingClientRect();
    setHover({ name, anchor: { left: box.left, right: box.right, top: box.top, bottom: box.bottom } });
  }

  // The hovered province is drawn last so its swollen outline sits above its neighbours.
  const shapes = hover ? [...IRAN_PROVINCE_SHAPES.filter((shape) => shape.name !== hover.name), ...IRAN_PROVINCE_SHAPES.filter((shape) => shape.name === hover.name)] : IRAN_PROVINCE_SHAPES;
  const hoveredEntry = hover ? placed.get(hover.name) : undefined;

  return (
    <figure ref={figureRef} className="relative m-0 grid gap-2">
      <svg viewBox={IRAN_MAP_VIEW_BOX} role="img" aria-label={ariaLabel} className="block h-auto w-full overflow-visible" onPointerLeave={(event) => { if (event.pointerType !== "touch") setHover(null); }}>
        {shapes.map((shape) => {
          const entry = placed.get(shape.name);
          const strength = entry ? mapIntensity(entry.value, peak) : 0;
          const fill = entry ? `color-mix(in srgb, var(--bp-accent) ${Math.round(24 + strength * 76)}%, var(--bp-divider))` : "var(--bp-divider)";
          return (
            <path
              key={shape.name}
              d={shape.d}
              className="bp-map-shape"
              data-hot={hover?.name === shape.name}
              style={{ fill, opacity: entry ? 1 : 0.55 }}
              onPointerEnter={(event) => { if (event.pointerType !== "touch") focusShape(shape.name, event.currentTarget); }}
              onPointerDown={(event) => { if (event.pointerType === "touch") { if (hover?.name === shape.name) setHover(null); else focusShape(shape.name, event.currentTarget); } }}
            />
          );
        })}
        {IRAN_PROVINCE_SHAPES.filter((shape) => labelled.has(shape.name)).map((shape) => (
          <text key={shape.name} x={shape.cx} y={shape.cy} textAnchor="middle" dominantBaseline="middle" className="bp-map-label" aria-hidden>{shape.name}</text>
        ))}
      </svg>
      {hover && (
        <BpChartTip
          containerRef={figureRef}
          anchor={hover.anchor}
          content={{
            headingLabel: "استان",
            heading: hover.name,
            rows: hoveredEntry
              ? hoveredEntry.rows.flatMap((row) => [
                { label: "فروش", value: row.valueLabel, color: "var(--bp-accent)" },
                ...(row.hint ? [{ label: "تعداد", value: row.hint, color: "var(--bp-success)" }] : []),
              ])
              : [{ label: "وضعیت", value: "بدون فروش", color: "var(--bp-muted)" }],
          }}
        />
      )}
      <figcaption className="grid gap-1.5">
        <div className="flex items-center gap-2 text-[10px]">
          <span className="bp-muted">کم</span>
          <span className="h-1.5 w-24 flex-none" style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--bp-accent) 24%, var(--bp-divider)), var(--bp-accent))", borderRadius: 3 }} aria-hidden />
          <span className="bp-muted">زیاد</span>
        </div>
        {unplaced.length > 0 && <span className="bp-muted text-[10px]">بدون استان مشخص: {unplaced.map((row) => `${row.valueLabel}${row.hint ? ` (${row.hint})` : ""}`).join("، ")}</span>}
        <span className="bp-muted text-[10px]">{IRAN_MAP_ATTRIBUTION}</span>
      </figcaption>
    </figure>
  );
}
