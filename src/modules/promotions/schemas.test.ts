import assert from "node:assert/strict";
import test from "node:test";
import { promotionSchema } from "./schemas";

const base = { title: "کمپین تست", startsAt: "2026-07-29", endsAt: "2026-08-29", isActive: true };

test("accepts a complete coupon campaign", () => {
  const result = promotionSchema.safeParse({ ...base, type: "COUPON", code: "welcome-20", discountType: "PERCENT", discountValue: 20, usageLimit: 100, perUserLimit: 1 });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.code, "WELCOME-20");
});

test("rejects percentages above one hundred", () => {
  const result = promotionSchema.safeParse({ ...base, type: "FIRST_PURCHASE", discountType: "PERCENT", discountValue: 101 });
  assert.equal(result.success, false);
});

test("requires reward expiry for next purchase", () => {
  const result = promotionSchema.safeParse({ ...base, type: "NEXT_PURCHASE", discountType: "FIXED", discountValue: 100_000 });
  assert.equal(result.success, false);
});

test("accepts free shipping without a monetary discount", () => {
  const result = promotionSchema.safeParse({ ...base, type: "FREE_SHIPPING", shippingScope: "TEHRAN" });
  assert.equal(result.success, true);
});

