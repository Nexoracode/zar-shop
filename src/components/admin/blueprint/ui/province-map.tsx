import { IRAN_MAP_ATTRIBUTION, IRAN_MAP_VIEW_BOX, IRAN_PROVINCE_SHAPES } from "@/data/iran-provinces";
import { mapIntensity, placeProvinces } from "@/lib/iran-map";

export type BpProvinceMapDatum = { province: string; value: number; valueLabel: string; hint?: string };

const LABELLED_PROVINCES = 5;

/**
 * A choropleth of Iran's provinces drawn from plain SVG paths — no mapping library. Each
 * province is shaded by its share of the busiest one and carries a tooltip with its figures; the
 * biggest few are named on the map. Figures that match no province (for example an address with
 * no province) are listed underneath instead of being silently left out.
 */
export function BpProvinceMap({ data, ariaLabel }: { data: BpProvinceMapDatum[]; ariaLabel: string }) {
  const { placed, unplaced } = placeProvinces(data);
  const peak = Math.max(0, ...[...placed.values()].map((entry) => entry.value));
  const labelled = new Set([...placed.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, LABELLED_PROVINCES).map(([name]) => name));

  return (
    <figure className="m-0 grid gap-2">
      <svg viewBox={IRAN_MAP_VIEW_BOX} role="img" aria-label={ariaLabel} className="block h-auto w-full">
        {IRAN_PROVINCE_SHAPES.map((shape) => {
          const entry = placed.get(shape.name);
          const strength = entry ? mapIntensity(entry.value, peak) : 0;
          const fill = entry ? `color-mix(in srgb, var(--bp-accent) ${Math.round(24 + strength * 76)}%, var(--bp-divider))` : "var(--bp-divider)";
          const tooltip = entry ? `${shape.name} — ${entry.rows.map((row) => `${row.valueLabel}${row.hint ? ` (${row.hint})` : ""}`).join("، ")}` : `${shape.name} — بدون فروش`;
          return (
            <path key={shape.name} d={shape.d} className="bp-map-shape" style={{ fill, opacity: entry ? 1 : 0.55 }}>
              <title>{tooltip}</title>
            </path>
          );
        })}
        {IRAN_PROVINCE_SHAPES.filter((shape) => labelled.has(shape.name)).map((shape) => (
          <text key={shape.name} x={shape.cx} y={shape.cy} textAnchor="middle" dominantBaseline="middle" className="bp-map-label" aria-hidden>{shape.name}</text>
        ))}
      </svg>
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
