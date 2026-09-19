import assert from "node:assert/strict";
import test from "node:test";
import { discountEndMoments, earliestDiscountEnd, earliestDiscountExpiry, earliestUpcoming, nextDiscountBoundary } from "./discount-window";

const now = Date.parse("2026-08-25T12:00:00.000Z");
const at = (iso: string) => ({ discountEndsAt: iso });

test("returns the soonest expiry still ahead of us", () => {
  const items = [at("2026-08-25T18:00:00.000Z"), at("2026-08-25T14:00:00.000Z"), at("2026-08-26T09:00:00.000Z")];
  assert.equal(earliestDiscountExpiry(items, now), "2026-08-25T14:00:00.000Z");
});

test("ignores windows that have already closed", () => {
  const items = [at("2026-08-25T09:00:00.000Z"), at("2026-08-25T16:00:00.000Z")];
  assert.equal(earliestDiscountExpiry(items, now), "2026-08-25T16:00:00.000Z");
});

test("returns null when nothing on the page is discounted", () => {
  assert.equal(earliestDiscountExpiry([{ discountEndsAt: null }, {}], now), null);
  assert.equal(earliestDiscountExpiry([], now), null);
});

test("returns null when every window has already closed", () => {
  assert.equal(earliestDiscountExpiry([at("2026-08-24T09:00:00.000Z")], now), null);
});

test("skips values that are not real dates", () => {
  assert.equal(earliestDiscountExpiry([at("not-a-date"), at("2026-08-25T15:00:00.000Z")], now), "2026-08-25T15:00:00.000Z");
});

test("nextDiscountBoundary also stops at a window that has not opened yet", () => {
  const rows = [{ discountStartsAt: "2026-08-25T20:00:00.000Z", discountEndsAt: "2026-08-26T20:00:00.000Z" }];
  assert.equal(nextDiscountBoundary(rows, now), "2026-08-25T20:00:00.000Z");
});

test("nextDiscountBoundary skips boundaries already behind us", () => {
  const rows = [{ discountStartsAt: "2026-08-25T09:00:00.000Z", discountEndsAt: "2026-08-25T17:00:00.000Z" }];
  assert.equal(nextDiscountBoundary(rows, now), "2026-08-25T17:00:00.000Z");
});

test("discountEndMoments lists each real end moment once, without reading the clock", () => {
  const items = [at("2026-08-25T18:00:00.000Z"), at("2026-08-25T18:00:00.000Z"), { discountEndsAt: null }, at("not-a-date"), { discountEndsAt: new Date("2026-08-25T09:00:00.000Z") }];
  assert.deepEqual(discountEndMoments(items), ["2026-08-25T18:00:00.000Z", "2026-08-25T09:00:00.000Z"]);
  assert.deepEqual(discountEndMoments([]), []);
});

test("earliestUpcoming picks the soonest moment ahead of the time the browser gives it", () => {
  const moments = discountEndMoments([at("2026-08-25T09:00:00.000Z"), at("2026-08-25T18:00:00.000Z"), at("2026-08-25T14:00:00.000Z")]);
  assert.equal(earliestUpcoming(moments, now), "2026-08-25T14:00:00.000Z");
  assert.equal(earliestUpcoming(moments, Date.parse("2026-08-26T00:00:00.000Z")), null);
});

test("earliestDiscountEnd is the soonest end whether or not it has passed", () => {
  assert.equal(earliestDiscountEnd([at("2026-08-25T18:00:00.000Z"), at("2026-08-25T09:00:00.000Z")]), "2026-08-25T09:00:00.000Z");
  assert.equal(earliestDiscountEnd([{}, { discountEndsAt: null }]), null);
});

test("nextDiscountBoundary accepts Date values as the admin rows carry them", () => {
  const rows = [{ discountStartsAt: new Date("2026-08-25T13:00:00.000Z"), discountEndsAt: new Date("2026-08-25T19:00:00.000Z") }];
  assert.equal(nextDiscountBoundary(rows, now), "2026-08-25T13:00:00.000Z");
});
