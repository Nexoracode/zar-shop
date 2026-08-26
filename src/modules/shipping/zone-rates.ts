/*
 * The store's own price table, used when a carrier rate is unavailable — or as the only source
 * for a method the store prices itself. Pure functions over rows the caller has already loaded.
 */

export type ZoneRate = {
  /** null is the catch-all row, applied when no province-specific row matches. */
  provinceId: string | null;
  maxWeightGrams: number;
  price: number;
};

/**
 * The price for a parcel of this weight going to this province, or null when the table does not
 * reach that far.
 *
 * A province-specific row always wins over the catch-all, even when the catch-all is cheaper —
 * the specific row is the deliberate statement about that route. Within a scope the narrowest
 * bracket that still covers the weight is the one that applies.
 */
export function tableRate(rates: ZoneRate[], provinceId: string, weightGrams: number) {
  const covering = rates.filter((rate) => rate.maxWeightGrams >= weightGrams);
  const scoped = covering.filter((rate) => rate.provinceId === provinceId);
  const candidates = scoped.length ? scoped : covering.filter((rate) => rate.provinceId === null);
  if (!candidates.length) return null;
  return candidates.reduce((best, rate) => (rate.maxWeightGrams < best.maxWeightGrams ? rate : best)).price;
}

/** The heaviest parcel the table can price for a province, for an "over this weight, call us" note. */
export function maxCoveredWeight(rates: ZoneRate[], provinceId: string) {
  const reachable = rates.filter((rate) => rate.provinceId === provinceId || rate.provinceId === null);
  return reachable.reduce((heaviest, rate) => Math.max(heaviest, rate.maxWeightGrams), 0);
}
