import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@generated/prisma/client";
import { PromotionValidationError, resolveCheckoutPromotions } from "./service";

const dateFields = {
  startsAt: new Date("2026-07-01T00:00:00.000Z"),
  endsAt: new Date("2026-08-31T23:59:59.999Z"),
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
};

const scopeFields = { itemScope: "ALL", targetProductIds: null as unknown, targetCategoryIds: null as unknown, audienceScope: "ALL", targetUserIds: null as unknown };

const coupon = {
  id: "coupon-1", title: "کد تابستان", type: "COUPON", code: "SUMMER", discountType: "PERCENT", discountValue: 20,
  minOrderAmount: 500_000, maxDiscountAmount: 150_000, usageLimit: 100, perUserLimit: 1, rewardExpiresDays: null,
  shippingScope: null, isActive: true, ...scopeFields, ...dateFields,
};

const freeShipping = {
  id: "shipping-1", title: "ارسال تهران", type: "FREE_SHIPPING", code: null, discountType: null, discountValue: null,
  minOrderAmount: 500_000, maxDiscountAmount: null, usageLimit: null, perUserLimit: 10, rewardExpiresDays: null,
  shippingScope: "TEHRAN", isActive: true, ...scopeFields, ...dateFields,
};

function checkoutDb(options?: { coupon?: typeof coupon | null }) {
  return {
    promotion: {
      findFirst: async () => options?.coupon === undefined ? coupon : options.coupon,
      findMany: async ({ where }: { where: { type: string } }) => where.type === "FREE_SHIPPING" ? [freeShipping] : [],
    },
    promotionRedemption: { count: async () => 0 },
    promotionReward: { findFirst: async () => null },
    order: { findFirst: async () => null },
    category: { findMany: async () => [] as { id: string; parentId: string | null }[] },
  } as unknown as PrismaClient;
}

const cartLines = [
  { productId: "p-target", categoryId: "c1", lineTotal: 400_000 },
  { productId: "p-other", categoryId: "c2", lineTotal: 600_000 },
];

test("applies coupon and free shipping together", async () => {
  const result = await resolveCheckoutPromotions(checkoutDb(), {
    userId: "user-1", couponCode: "summer", merchandiseAmount: 1_000_000, shippingFee: 80_000, city: "تهران",
    now: new Date("2026-07-29T12:00:00.000Z"),
  });
  assert.equal(result.promotionDiscount, 150_000);
  assert.equal(result.shippingDiscount, 80_000);
  assert.deepEqual(result.applications.map((item) => item.type), ["COUPON", "FREE_SHIPPING"]);
});

test("rejects an unknown coupon instead of silently ignoring it", async () => {
  await assert.rejects(
    resolveCheckoutPromotions(checkoutDb({ coupon: null }), { userId: "user-1", couponCode: "INVALID", merchandiseAmount: 1_000_000, shippingFee: 0, city: "تهران" }),
    PromotionValidationError,
  );
});

test("product-scoped coupon discounts only the matching lines", async () => {
  const scoped = { ...coupon, itemScope: "PRODUCTS", targetProductIds: ["p-target"] };
  const result = await resolveCheckoutPromotions(checkoutDb({ coupon: scoped }), {
    userId: "user-1", couponCode: "summer", merchandiseAmount: 1_000_000, shippingFee: 0, city: "تهران",
    lines: cartLines, now: new Date("2026-07-29T12:00:00.000Z"),
  });
  assert.equal(result.promotionDiscount, 80_000); // 20% of the 400,000 matching line only
});

test("rejects a coupon whose targeted products are not in the cart", async () => {
  const scoped = { ...coupon, itemScope: "PRODUCTS", targetProductIds: ["p-missing"] };
  await assert.rejects(
    resolveCheckoutPromotions(checkoutDb({ coupon: scoped }), {
      userId: "user-1", couponCode: "summer", merchandiseAmount: 1_000_000, shippingFee: 0, city: "تهران",
      lines: cartLines, now: new Date("2026-07-29T12:00:00.000Z"),
    }),
    PromotionValidationError,
  );
});

test("rejects a coupon targeted at other users", async () => {
  const scoped = { ...coupon, audienceScope: "SPECIFIC_USERS", targetUserIds: ["someone-else"] };
  await assert.rejects(
    resolveCheckoutPromotions(checkoutDb({ coupon: scoped }), {
      userId: "user-1", couponCode: "summer", merchandiseAmount: 1_000_000, shippingFee: 0, city: "تهران",
      now: new Date("2026-07-29T12:00:00.000Z"),
    }),
    PromotionValidationError,
  );
});
