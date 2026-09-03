import assert from "node:assert/strict";
import test from "node:test";
import { calculatePromotionDiscount, eligibleAmountForScope, isWithinPromotionWindow, matchesShippingScope, meetsMinimumOrder } from "./rules";

const lines = [
  { productId: "p1", categoryId: "c-shoes", lineTotal: 300_000 },
  { productId: "p2", categoryId: "c-bags", lineTotal: 700_000 },
];

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

test("scoped eligible amount narrows the discount base", () => {
  assert.equal(eligibleAmountForScope(1_000_000, lines, { itemScope: "ALL", targetProductIds: [] }, new Set()), 1_000_000);
  assert.equal(eligibleAmountForScope(1_000_000, undefined, { itemScope: "PRODUCTS", targetProductIds: ["p1"] }, new Set()), 1_000_000);
  assert.equal(eligibleAmountForScope(1_000_000, lines, { itemScope: "PRODUCTS", targetProductIds: ["p1"] }, new Set()), 300_000);
  assert.equal(eligibleAmountForScope(1_000_000, lines, { itemScope: "PRODUCTS", targetProductIds: ["nope"] }, new Set()), 0);
  assert.equal(eligibleAmountForScope(1_000_000, lines, { itemScope: "CATEGORIES", targetProductIds: [] }, new Set(["c-bags", "c-bags-kids"])), 700_000);
});

test("checks minimum order and Tehran shipping scope", () => {
  assert.equal(meetsMinimumOrder(500_000, "500000"), true);
  assert.equal(matchesShippingScope("TEHRAN", "تهران"), true);
  assert.equal(matchesShippingScope("TEHRAN", "شیراز"), false);
  assert.equal(matchesShippingScope("ALL", "شیراز"), true);
});

