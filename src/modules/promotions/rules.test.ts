import assert from "node:assert/strict";
import test from "node:test";
import { calculatePromotionDiscount, isWithinPromotionWindow, matchesShippingScope, meetsMinimumOrder } from "./rules";

test("calculates percentage promotion with a cap", () => {
  assert.equal(calculatePromotionDiscount(1_000_000, { discountType: "PERCENT", discountValue: 20, maxDiscountAmount: 150_000 }), 150_000);
});

test("keeps at least one rial payable", () => {
  assert.equal(calculatePromotionDiscount(100, { discountType: "FIXED", discountValue: 500 }), 99);
});

test("checks promotion window inclusively", () => {
  const now = new Date("2026-07-29T12:00:00.000Z");
  assert.equal(isWithinPromotionWindow("2026-07-29T00:00:00.000Z", "2026-07-29T23:59:59.999Z", now), true);
  assert.equal(isWithinPromotionWindow("2026-07-30T00:00:00.000Z", "2026-07-30T23:59:59.999Z", now), false);
});

test("checks minimum order and Tehran shipping scope", () => {
  assert.equal(meetsMinimumOrder(500_000, "500000"), true);
  assert.equal(matchesShippingScope("TEHRAN", "تهران"), true);
  assert.equal(matchesShippingScope("TEHRAN", "شیراز"), false);
  assert.equal(matchesShippingScope("ALL", "شیراز"), true);
});

