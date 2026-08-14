export type PromotionDiscountType = "PERCENT" | "FIXED";

export type PromotionRule = {
  discountType: PromotionDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
};

export function calculatePromotionDiscount(amount: number, rule: PromotionRule) {
  if (!Number.isFinite(amount) || amount <= 1 || !Number.isFinite(rule.discountValue) || rule.discountValue <= 0) return 0;
  const value = new Prisma.Decimal(rule.discountValue);
  const requested = (rule.discountType === "PERCENT"
    ? new Prisma.Decimal(amount).mul(Prisma.Decimal.min(value, 100)).div(100)
    : value).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
  const capped = rule.maxDiscountAmount && rule.maxDiscountAmount > 0 ? Math.min(requested, Math.round(rule.maxDiscountAmount)) : requested;
  return Math.min(Math.max(0, capped), Math.max(0, Math.round(amount) - 1));
}

export function isWithinPromotionWindow(startsAt: Date | string, endsAt: Date | string, now = new Date()) {
  return now >= new Date(startsAt) && now <= new Date(endsAt);
}

export function meetsMinimumOrder(amount: number, minimum: number | string | { toString(): string } | null | undefined) {
  return amount >= Number(minimum ?? 0);
}

export function matchesShippingScope(scope: string | null | undefined, city: string) {
  if (scope === "ALL") return true;
  if (scope === "TEHRAN") return city.trim().replace(/ي/g, "ی").replace(/ك/g, "ک") === "تهران";
  return false;
}

import { Prisma } from "@generated/prisma/client";
