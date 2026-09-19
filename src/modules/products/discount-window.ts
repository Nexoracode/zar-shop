/*
 * Discount window arithmetic, deliberately free of any Prisma import.
 *
 * `discount.ts` needs `Prisma.Decimal` for the money maths, and importing it from a client
 * component drags the database client — and `node:async_hooks` — into the browser bundle, which
 * webpack refuses to build. These helpers are pure date comparisons, so they live apart and can
 * be imported from either side.
 */

export type DiscountMoment = Date | string | null | undefined;

function momentTimes(values: DiscountMoment[]) {
  return values
    .filter((value): value is Date | string => Boolean(value))
    .map((value) => (value instanceof Date ? value.getTime() : new Date(value).getTime()))
    .filter((time) => Number.isFinite(time));
}

function earliestFuture(values: DiscountMoment[], now: number) {
  const upcoming = momentTimes(values).filter((time) => time > now);
  return upcoming.length ? new Date(Math.min(...upcoming)).toISOString() : null;
}

/**
 * `earliestFuture` for callers that only have the raw moments and read the clock themselves — the
 * client-side `DiscountExpiryRefresh`. A page must not call `Date.now()` while it renders (Next
 * refuses to prerender an unstable value), so the server hands over the moments and the browser
 * decides which of them is still ahead.
 */
export function earliestUpcoming(moments: DiscountMoment[], now: number) {
  return earliestFuture(moments, now);
}

/** Every distinct `discountEndsAt` among `items`, as ISO strings — no clock involved, so it is safe to call while rendering. */
export function discountEndMoments(items: Array<{ discountEndsAt?: DiscountMoment }>) {
  return [...new Set(momentTimes(items.map((item) => item.discountEndsAt)).map((time) => new Date(time).toISOString()))];
}

/** The soonest `discountEndsAt` among `items` whether or not it has passed, or null. For lists the server already limited to running discounts. */
export function earliestDiscountEnd(items: Array<{ discountEndsAt?: DiscountMoment }>) {
  const times = momentTimes(items.map((item) => item.discountEndsAt));
  return times.length ? new Date(Math.min(...times)).toISOString() : null;
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
