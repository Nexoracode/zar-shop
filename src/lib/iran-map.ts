import { IRAN_PROVINCE_SHAPES } from "@/data/iran-provinces";
import { normalizeSearchText } from "@/lib/text-search";

const shapeKeys = new Map(IRAN_PROVINCE_SHAPES.map((shape) => [normalizeSearchText(shape.name), shape.name]));

/**
 * Splits per-province figures into those that land on a map shape and those that do not.
 * Names are compared after Persian normalisation (Arabic ي/ك, zero-width joiners, spacing), so
 * an address typed as "خراسان‌رضوی" or "خراسان رضوي" still finds its province. Rows for the same
 * province are summed; anything unmatched (e.g. "نامشخص") is returned separately, never dropped.
 */
export function placeProvinces<T extends { province: string; value: number }>(data: T[]): { placed: Map<string, { value: number; rows: T[] }>; unplaced: T[] } {
  const placed = new Map<string, { value: number; rows: T[] }>();
  const unplaced: T[] = [];
  for (const row of data) {
    const shapeName = shapeKeys.get(normalizeSearchText(row.province));
    if (!shapeName) { unplaced.push(row); continue; }
    const current = placed.get(shapeName) ?? { value: 0, rows: [] };
    current.value += row.value;
    current.rows.push(row);
    placed.set(shapeName, current);
  }
  return { placed, unplaced };
}

/** Fill strength from 0 to 1 for a value against the busiest province; eased so mid-sized provinces stay visible next to a dominant one. */
export function mapIntensity(value: number, peak: number): number {
  if (value <= 0 || peak <= 0) return 0;
  return Math.pow(Math.min(1, value / peak), 0.6);
}
