import { compactNumber, niceCeil } from "@/lib/chart-scale";

export type BpBarSeries = { key: string; label: string; color: string };
export type BpBarChartPoint = { label: string; values: Record<string, number> };

const GRID_LINES = 4;

/**
 * A grouped bar chart drawn with plain elements — no charting library, same reasoning as
 * `BpLineChart`. The plot is laid out left→right oldest→newest (`dir="ltr"` on the plot only, as
 * a time axis reads that way in the line chart too) while every label keeps its own RTL text.
 * Bars are HTML rather than SVG so their rounded tops keep their shape at any width.
 */
export function BpBarChart({ data, series, ariaLabel, height = 220 }: { data: BpBarChartPoint[]; series: BpBarSeries[]; ariaLabel: string; height?: number }) {
  const peak = Math.max(0, ...data.flatMap((point) => series.map((item) => point.values[item.key] ?? 0)));
  const ceiling = niceCeil(peak);
  const ticks = Array.from({ length: GRID_LINES + 1 }, (_, index) => (ceiling / GRID_LINES) * (GRID_LINES - index));
  // Thin the day labels out on narrow charts but always keep the first and last one.
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div role="img" aria-label={ariaLabel} className="w-full" dir="ltr">
      <div className="flex gap-2" style={{ height }}>
        <div className="relative w-9 shrink-0" aria-hidden>
          {ticks.map((tick, index) => (
            <span key={index} className="bp-muted absolute right-0 -translate-y-1/2 text-[10px] leading-none" style={{ top: `${(index / GRID_LINES) * 100}%` }}>{compactNumber(tick)}</span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          {ticks.map((_, index) => (
            <span key={index} className="absolute inset-x-0 border-t border-dashed border-[var(--bp-divider)]" style={{ top: `${(index / GRID_LINES) * 100}%` }} aria-hidden />
          ))}
          <div className="absolute inset-0 flex items-end justify-between gap-1">
            {data.map((point) => (
              <div key={point.label} className="flex h-full min-w-0 flex-1 items-end justify-center gap-[3px]" title={`${point.label} — ${series.map((item) => `${item.label}: ${(point.values[item.key] ?? 0).toLocaleString("fa-IR")}`).join("، ")}`}>
                {series.map((item) => {
                  const value = point.values[item.key] ?? 0;
                  return <span key={item.key} className="bp-bar w-full max-w-[16px]" style={{ height: `${(value / ceiling) * 100}%`, background: `linear-gradient(180deg, ${item.color}, color-mix(in srgb, ${item.color} 55%, transparent))` }} />;
                })}
              </div>
            ))}
          </div>
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
