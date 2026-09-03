import type { Promotion, Prisma } from "@generated/prisma/client";
import type { PromotionInput } from "@/modules/promotions/schemas";

export function promotionData(input: PromotionInput): Prisma.PromotionUncheckedCreateInput {
  return {
    title: input.title,
    type: input.type,
    code: input.code,
    discountType: input.discountType,
    discountValue: input.discountValue,
    minOrderAmount: input.minOrderAmount,
    maxDiscountAmount: input.maxDiscountAmount,
    usageLimit: input.usageLimit,
    perUserLimit: input.perUserLimit,
    rewardExpiresDays: input.rewardExpiresDays,
    shippingScope: input.shippingScope,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    isActive: input.isActive,
    ...(input.itemScope !== undefined
      ? {
          itemScope: input.itemScope,
          targetProductIds: input.itemScope === "PRODUCTS" ? (input.targetProductIds ?? []) : [],
          targetCategoryIds: input.itemScope === "CATEGORIES" ? (input.targetCategoryIds ?? []) : [],
        }
      : {}),
    ...(input.audienceScope !== undefined
      ? {
          audienceScope: input.audienceScope,
          targetUserIds: input.audienceScope === "SPECIFIC_USERS" ? (input.targetUserIds ?? []) : [],
        }
      : {}),
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export function serializePromotion(promotion: Promotion & { _count?: { redemptions: number; rewards: number } }) {
  return {
    id: promotion.id,
    title: promotion.title,
    type: promotion.type,
    code: promotion.code,
    discountType: promotion.discountType,
    discountValue: promotion.discountValue === null ? null : Number(promotion.discountValue),
    minOrderAmount: promotion.minOrderAmount === null ? null : Number(promotion.minOrderAmount),
    maxDiscountAmount: promotion.maxDiscountAmount === null ? null : Number(promotion.maxDiscountAmount),
    usageLimit: promotion.usageLimit,
    perUserLimit: promotion.perUserLimit,
    rewardExpiresDays: promotion.rewardExpiresDays,
    shippingScope: promotion.shippingScope === "TEHRAN" ? "TEHRAN" as const : promotion.shippingScope === "ALL" ? "ALL" as const : null,
    itemScope: promotion.itemScope === "PRODUCTS" ? "PRODUCTS" as const : promotion.itemScope === "CATEGORIES" ? "CATEGORIES" as const : "ALL" as const,
    targetProductIds: stringArray(promotion.targetProductIds),
    targetCategoryIds: stringArray(promotion.targetCategoryIds),
    audienceScope: promotion.audienceScope === "SPECIFIC_USERS" ? "SPECIFIC_USERS" as const : "ALL" as const,
    targetUserIds: stringArray(promotion.targetUserIds),
    startsAt: promotion.startsAt.toISOString(),
    endsAt: promotion.endsAt.toISOString(),
    isActive: promotion.isActive,
    createdAt: promotion.createdAt.toISOString(),
    updatedAt: promotion.updatedAt.toISOString(),
    usageCount: promotion._count?.redemptions ?? 0,
    rewardCount: promotion._count?.rewards ?? 0,
  };
}
