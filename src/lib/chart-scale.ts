/** Rounds `value` up to a "nice" chart ceiling (1, 2, 2.5 or 5 × a power of ten) so grid lines land on readable numbers. */
export function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const fraction = value / magnitude;
  const step = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return step * magnitude;
}

/** Compact Persian number for axis ticks: 1200 → "۱٫۲K", so a tick never outgrows the gutter. */
export function compactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(Math.round(value / 100_000) / 10).toLocaleString("fa-IR")}M`;
  if (Math.abs(value) >= 1_000) return `${(Math.round(value / 100) / 10).toLocaleString("fa-IR")}K`;
  return Math.round(value).toLocaleString("fa-IR");
}
