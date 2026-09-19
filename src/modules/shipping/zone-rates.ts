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
 * has no row for that route at all.
 *
 * A province-specific row always wins over the catch-all, even when the catch-all is cheaper —
 * the specific row is the deliberate statement about that route. Within a scope the narrowest
 * bracket that still covers the weight is the one that applies.
 *
 * A parcel heavier than the table's highest bracket is not left unpriced: it ships as several
 * parcels, each filling the highest bracket and paying its price, plus whatever remains priced
 * from the table again. With one bracket of 1000 g at 260 000, 2 500 g is 2 × 260 000 + 260 000.
 */
export function tableRate(rates: ZoneRate[], provinceId: string, weightGrams: number): number | null {
  const covering = rates.filter((rate) => rate.maxWeightGrams >= weightGrams);
  const scoped = covering.filter((rate) => rate.provinceId === provinceId);
  const candidates = scoped.length ? scoped : covering.filter((rate) => rate.provinceId === null);
  if (candidates.length) return narrowest(candidates).price;

  // Nothing covers the weight: split it over the highest bracket of the scope that applies.
  const provinceRows = rates.filter((rate) => rate.provinceId === provinceId);
  const scope = provinceRows.length ? provinceRows : rates.filter((rate) => rate.provinceId === null);
  if (!scope.length) return null;
  const top = scope.reduce((best, rate) => (rate.maxWeightGrams > best.maxWeightGrams ? rate : best));
  const fullParcels = Math.floor(weightGrams / top.maxWeightGrams);
  const remainder = weightGrams - fullParcels * top.maxWeightGrams;
  // The remainder is below the top bracket, so it is always covered by some row of this scope.
  return fullParcels * top.price + (remainder > 0 ? tableRate(scope, provinceId, remainder) ?? top.price : 0);
}

function narrowest(rates: ZoneRate[]) {
  return rates.reduce((best, rate) => (rate.maxWeightGrams < best.maxWeightGrams ? rate : best));
}

/** The heaviest parcel the table can price for a province, for an "over this weight, call us" note. */
export function maxCoveredWeight(rates: ZoneRate[], provinceId: string) {
  const reachable = rates.filter((rate) => rate.provinceId === provinceId || rate.provinceId === null);
  return reachable.reduce((heaviest, rate) => Math.max(heaviest, rate.maxWeightGrams), 0);
}
