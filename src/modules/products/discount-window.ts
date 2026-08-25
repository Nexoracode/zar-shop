/*
 * Discount window arithmetic, deliberately free of any Prisma import.
 *
 * `discount.ts` needs `Prisma.Decimal` for the money maths, and importing it from a client
 * component drags the database client — and `node:async_hooks` — into the browser bundle, which
 * webpack refuses to build. These helpers are pure date comparisons, so they live apart and can
 * be imported from either side.
 */

export type DiscountMoment = Date | string | null | undefined;

function earliestFuture(values: DiscountMoment[], now: number) {
  const upcoming = values
    .filter((value): value is Date | string => Boolean(value))
    .map((value) => (value instanceof Date ? value.getTime() : new Date(value).getTime()))
    .filter((time) => Number.isFinite(time) && time > now);
  return upcoming.length ? new Date(Math.min(...upcoming)).toISOString() : null;
}

/**
 * The soonest moment at which something on the page stops being discounted, or null when nothing
 * on it is. Pages hand this to `DiscountExpiryRefresh` so the rendered prices cannot go stale.
 */
export function earliestDiscountExpiry(items: Array<{ discountEndsAt?: DiscountMoment }>, now = Date.now()) {
  return earliestFuture(items.map((item) => item.discountEndsAt), now);
}

/**
 * The soonest moment at which any row's discount state changes — a window opening as well as one
 * closing. The admin table marks scheduled discounts too, so it has to redraw at both edges,
 * where a storefront price only ever changes when a discount ends.
 */
export function nextDiscountBoundary(items: Array<{ discountStartsAt?: DiscountMoment; discountEndsAt?: DiscountMoment }>, now = Date.now()) {
  return earliestFuture(items.flatMap((item) => [item.discountStartsAt, item.discountEndsAt]), now);
}
