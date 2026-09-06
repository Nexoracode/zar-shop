export type BpDonutSlice = { label: string; value: number; color: string };

const SIZE = 160;
const THICKNESS = 22;
const RADIUS = (SIZE - THICKNESS) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Each slice's dash length plus where it starts, built with a running total carried through
 * `reduce`'s own accumulator rather than a mutated outer variable — this runs during render, and
 * React's compiler flags reassigning a render-scoped variable across iterations. */
function layoutSlices(data: BpDonutSlice[], total: number) {
  return data.reduce<{ slice: BpDonutSlice; dash: number; dashOffset: number; cumulative: number }[]>((rows, slice) => {
    const previousCumulative = rows.length ? rows[rows.length - 1].cumulative : 0;
    const fraction = slice.value / total;
    const dash = fraction * CIRCUMFERENCE;
    return [...rows, { slice, dash, dashOffset: -previousCumulative * CIRCUMFERENCE, cumulative: previousCumulative + fraction }];
  }, []);
}

/** A minimal inline-SVG donut chart, same no-library reasoning as `BpLineChart`. */
export function BpDonutChart({ data, ariaLabel }: { data: BpDonutSlice[]; ariaLabel: string }) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const segments = layoutSlices(data, total);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label={ariaLabel} className="shrink-0">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--bp-divider)" strokeWidth={THICKNESS} />
        {segments.map(({ slice, dash, dashOffset }) => (
          <circle
            key={slice.label}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={slice.color}
            strokeWidth={THICKNESS}
            strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          >
            <title>{`${slice.label}: ${slice.value.toLocaleString("fa-IR")}`}</title>
          </circle>
        ))}
        <text x={SIZE / 2} y={SIZE / 2 - 4} textAnchor="middle" className="fill-[var(--bp-text)]" style={{ font: "700 20px var(--bp-font)" }}>{total.toLocaleString("fa-IR")}</text>
        <text x={SIZE / 2} y={SIZE / 2 + 16} textAnchor="middle" className="fill-[var(--bp-muted)]" style={{ font: "400 11px var(--bp-font)" }}>سفارش</text>
      </svg>
      <ul className="m-0 grid w-full min-w-0 list-none gap-1.5 p-0">
        {data.map((slice) => (
          <li key={slice.label} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="flex min-w-0 items-center gap-2"><i aria-hidden className="block size-2.5 shrink-0 rounded-full" style={{ background: slice.color }} /><span className="truncate">{slice.label}</span></span>
            <span className="bp-muted shrink-0">{slice.value.toLocaleString("fa-IR")} ({Math.round((slice.value / total) * 100).toLocaleString("fa-IR")}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
