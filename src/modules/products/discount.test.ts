import assert from "node:assert/strict";
import test from "node:test";
import { calculateDiscountedPrice, tehranDateEnd, tehranDateStart } from "./discount";

const activeRange = {
  discountStartsAt: new Date("2026-07-28T20:30:00.000Z"),
  discountEndsAt: new Date("2026-07-30T20:29:59.999Z"),
};

test("applies an active percentage discount", () => {
  const result = calculateDiscountedPrice(1_000_000, { ...activeRange, discountType: "PERCENT", discountValue: 10 }, new Date("2026-07-29T12:00:00.000Z"));
  assert.deepEqual(result, { originalPrice: 1_000_000, discountAmount: 100_000, finalPrice: 900_000, isActive: true });
});

test("does not apply a discount outside its schedule", () => {
  const result = calculateDiscountedPrice(1_000_000, { ...activeRange, discountType: "FIXED", discountValue: 50_000 }, new Date("2026-08-01T12:00:00.000Z"));
  assert.equal(result.finalPrice, 1_000_000);
  assert.equal(result.isActive, false);
});

test("keeps at least one rial payable", () => {
  const result = calculateDiscountedPrice(100, { ...activeRange, discountType: "FIXED", discountValue: 500 }, new Date("2026-07-29T12:00:00.000Z"));
  assert.equal(result.finalPrice, 1);
});

test("applies a فروش ویژه with no window at all, active regardless of the clock", () => {
  const noSchedule = { discountType: "PERCENT" as const, discountValue: 10, discountStartsAt: null, discountEndsAt: null };
  const result = calculateDiscountedPrice(1_000_000, noSchedule, new Date("2099-01-01T00:00:00.000Z"));
  assert.deepEqual(result, { originalPrice: 1_000_000, discountAmount: 100_000, finalPrice: 900_000, isActive: true });
});

test("converts Tehran day boundaries to UTC", () => {
  assert.equal(tehranDateStart("2026-07-29")?.toISOString(), "2026-07-28T20:30:00.000Z");
  assert.equal(tehranDateEnd("2026-07-29")?.toISOString(), "2026-07-29T20:29:59.999Z");
});

test("keeps a full instant untouched, so a picked time of day survives", () => {
  assert.equal(tehranDateStart("2026-07-29T09:30:00.000Z")?.toISOString(), "2026-07-29T09:30:00.000Z");
  assert.equal(tehranDateEnd("2026-07-30T18:45:00.000Z")?.toISOString(), "2026-07-30T18:45:00.000Z");
});
