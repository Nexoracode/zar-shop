/*
 * Choosing a delivery option on the customer's behalf, deliberately free of any Prisma or network
 * import so it can be unit tested — the same shape as `parcel.ts` and `packaging.ts`.
 */

/** The fields of a priced option this choice depends on. */
export type PricedOption = { price: number };

/**
 * The option the checkout uses when the customer is not asked: the cheapest one the store can
 * price. Ties keep the admin's own ordering, since the list arrives already sorted by it.
 */
export function pickCheapestOption<T extends PricedOption>(options: readonly T[]): T | null {
  let best: T | null = null;
  for (const option of options) if (best === null || option.price < best.price) best = option;
  return best;
}
