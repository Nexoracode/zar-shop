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
  };
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
    startsAt: promotion.startsAt.toISOString(),
    endsAt: promotion.endsAt.toISOString(),
    isActive: promotion.isActive,
    createdAt: promotion.createdAt.toISOString(),
    updatedAt: promotion.updatedAt.toISOString(),
    usageCount: promotion._count?.redemptions ?? 0,
    rewardCount: promotion._count?.rewards ?? 0,
  };
}
