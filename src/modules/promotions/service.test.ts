import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@generated/prisma/client";
import { issueNextPurchaseRewards, listQualifyingPromotions, PromotionValidationError, resolveCheckoutPromotions } from "./service";

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

const firstPurchase = {
  id: "fp-1", title: "خرید اول", type: "FIRST_PURCHASE", code: null, discountType: "PERCENT", discountValue: 15,
  minOrderAmount: null, maxDiscountAmount: null, usageLimit: null, perUserLimit: 1, rewardExpiresDays: null,
  shippingScope: null, isActive: true, announceInApp: true, ...scopeFields, ...dateFields,
};

function signupDb(options: { paidOrder?: boolean; promotions?: unknown[] }) {
  return {
    order: { findFirst: async () => (options.paidOrder ? { id: "o1" } : null) },
    promotion: { findMany: async () => options.promotions ?? [firstPurchase] },
    promotionRedemption: { count: async () => 0 },
  } as unknown as PrismaClient;
}

test("listQualifyingPromotions returns active first-purchase offers when the user has no paid order", async () => {
  const result = await listQualifyingPromotions(signupDb({}), { userId: "user-1", type: "FIRST_PURCHASE", now: new Date("2026-07-29T12:00:00.000Z") });
  assert.deepEqual(result.map((promotion) => promotion.id), ["fp-1"]);
});

test("listQualifyingPromotions returns nothing once the user has paid an order", async () => {
  const result = await listQualifyingPromotions(signupDb({ paidOrder: true }), { userId: "user-1", type: "FIRST_PURCHASE" });
  assert.deepEqual(result, []);
});

test("listQualifyingPromotions skips a first-purchase promo aimed at other users", async () => {
  const scoped = { ...firstPurchase, audienceScope: "SPECIFIC_USERS", targetUserIds: ["someone-else"] };
  const result = await listQualifyingPromotions(signupDb({ promotions: [scoped] }), { userId: "user-1", type: "FIRST_PURCHASE" });
  assert.deepEqual(result, []);
});

const nextPurchase = {
  id: "np-1", title: "خرید بعدی", type: "NEXT_PURCHASE", code: null, discountType: "FIXED", discountValue: 100_000,
  minOrderAmount: null, maxDiscountAmount: null, usageLimit: null, perUserLimit: 1, rewardExpiresDays: 30,
  shippingScope: null, isActive: true, ...scopeFields, ...dateFields,
};

function rewardDb(existingSourceOrders: string[]) {
  let created = 0;
  const db = {
    promotion: { findMany: async () => [nextPurchase] },
    promotionReward: {
      findMany: async () => existingSourceOrders.map((promotionId) => ({ promotionId })),
      count: async () => 0,
      create: async () => ({ id: `reward-${(created += 1)}` }),
    },
  } as unknown as PrismaClient;
  return db;
}

test("issueNextPurchaseRewards returns the reward it creates", async () => {
  const issued = await issueNextPurchaseRewards(rewardDb([]), { orderId: "order-1", userId: "user-1", merchandiseAmount: 1_000_000 });
  assert.equal(issued.length, 1);
  assert.equal(issued[0].promotionId, "np-1");
  assert.equal(issued[0].rewardId, "reward-1");
});

test("issueNextPurchaseRewards is a no-op when the order already has its reward", async () => {
  const issued = await issueNextPurchaseRewards(rewardDb(["np-1"]), { orderId: "order-1", userId: "user-1", merchandiseAmount: 1_000_000 });
  assert.deepEqual(issued, []);
});
