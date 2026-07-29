import type { Prisma, PrismaClient } from "@generated/prisma/client";
import { calculatePromotionDiscount, matchesShippingScope, meetsMinimumOrder } from "@/modules/promotions/rules";

type DbLike = PrismaClient | Prisma.TransactionClient;

export class PromotionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromotionValidationError";
  }
}

type CheckoutPromotion = {
  promotionId: string;
  title: string;
  type: "COUPON" | "FREE_SHIPPING" | "NEXT_PURCHASE" | "FIRST_PURCHASE";
  code: string | null;
  discountAmount: number;
  shippingDiscount: number;
  rewardId?: string;
  snapshot: Prisma.InputJsonObject;
};

export type CheckoutPromotionResult = {
  promotionDiscount: number;
  shippingDiscount: number;
  applications: CheckoutPromotion[];
  rewardId: string | null;
};

const paidOrderStatuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

function promotionSnapshot(promotion: {
  id: string; title: string; type: string; code: string | null; discountType: string | null; discountValue: unknown;
  minOrderAmount: unknown; maxDiscountAmount: unknown; startsAt: Date; endsAt: Date;
}) {
  return {
    id: promotion.id,
    title: promotion.title,
    type: promotion.type,
    code: promotion.code,
    discountType: promotion.discountType,
    discountValue: promotion.discountValue === null ? null : Number(promotion.discountValue),
    minOrderAmount: promotion.minOrderAmount === null ? null : Number(promotion.minOrderAmount),
    maxDiscountAmount: promotion.maxDiscountAmount === null ? null : Number(promotion.maxDiscountAmount),
    startsAt: promotion.startsAt.toISOString(),
    endsAt: promotion.endsAt.toISOString(),
  } satisfies Prisma.InputJsonObject;
}

async function ensureUsageAvailable(db: DbLike, promotion: { id: string; usageLimit: number | null; perUserLimit: number }, userId: string) {
  const [total, userTotal] = await Promise.all([
    promotion.usageLimit === null ? Promise.resolve(0) : db.promotionRedemption.count({ where: { promotionId: promotion.id } }),
    db.promotionRedemption.count({ where: { promotionId: promotion.id, userId } }),
  ]);
  if (promotion.usageLimit !== null && total >= promotion.usageLimit) return false;
  return userTotal < promotion.perUserLimit;
}

export async function resolveCheckoutPromotions(db: DbLike, input: {
  userId: string;
  couponCode?: string | null;
  merchandiseAmount: number;
  shippingFee: number;
  city: string;
  now?: Date;
}): Promise<CheckoutPromotionResult> {
  const now = input.now ?? new Date();
  const applications: CheckoutPromotion[] = [];
  let rewardId: string | null = null;
  const activeWhere = { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } } as const;

  let discountPromotion: Awaited<ReturnType<typeof db.promotion.findFirst>> | null = null;
  let discountValue: { discountType: "PERCENT" | "FIXED"; discountValue: number; maxDiscountAmount: number | null } | null = null;
  const normalizedCode = input.couponCode?.trim().toUpperCase() || null;

  if (normalizedCode) {
    const coupon = await db.promotion.findFirst({ where: { ...activeWhere, type: "COUPON", code: normalizedCode } });
    if (!coupon) throw new PromotionValidationError("کد تخفیف معتبر یا فعال نیست.");
    if (!meetsMinimumOrder(input.merchandiseAmount, coupon.minOrderAmount)) throw new PromotionValidationError("حداقل مبلغ لازم برای استفاده از این کد تخفیف تأمین نشده است.");
    if (!(await ensureUsageAvailable(db, coupon, input.userId))) throw new PromotionValidationError("ظرفیت استفاده از این کد تخفیف به پایان رسیده است.");
    if (!coupon.discountType || coupon.discountValue === null) throw new PromotionValidationError("تنظیمات کد تخفیف کامل نیست.");
    discountPromotion = coupon;
    discountValue = { discountType: coupon.discountType, discountValue: Number(coupon.discountValue), maxDiscountAmount: coupon.maxDiscountAmount === null ? null : Number(coupon.maxDiscountAmount) };
  } else {
    const reward = await db.promotionReward.findFirst({
      where: { userId: input.userId, redeemedOrderId: null, expiresAt: { gte: now } },
      include: { promotion: true },
      orderBy: { expiresAt: "asc" },
    });
    if (reward && meetsMinimumOrder(input.merchandiseAmount, reward.promotion.minOrderAmount)) {
      discountPromotion = reward.promotion;
      discountValue = { discountType: reward.discountType, discountValue: Number(reward.discountValue), maxDiscountAmount: reward.maxDiscountAmount === null ? null : Number(reward.maxDiscountAmount) };
      rewardId = reward.id;
    } else {
      const hasPaidOrder = await db.order.findFirst({ where: { userId: input.userId, status: { in: [...paidOrderStatuses] } }, select: { id: true } });
      if (!hasPaidOrder) {
        const firstPurchasePromotions = await db.promotion.findMany({ where: { ...activeWhere, type: "FIRST_PURCHASE" }, orderBy: { createdAt: "asc" } });
        for (const promotion of firstPurchasePromotions) {
          if (!meetsMinimumOrder(input.merchandiseAmount, promotion.minOrderAmount) || !(await ensureUsageAvailable(db, promotion, input.userId))) continue;
          if (!promotion.discountType || promotion.discountValue === null) continue;
          discountPromotion = promotion;
          discountValue = { discountType: promotion.discountType, discountValue: Number(promotion.discountValue), maxDiscountAmount: promotion.maxDiscountAmount === null ? null : Number(promotion.maxDiscountAmount) };
          break;
        }
      }
    }
  }

  if (discountPromotion && discountValue) {
    const discountAmount = calculatePromotionDiscount(input.merchandiseAmount, discountValue);
    if (discountAmount > 0) applications.push({
      promotionId: discountPromotion.id,
      title: discountPromotion.title,
      type: discountPromotion.type,
      code: discountPromotion.code,
      discountAmount,
      shippingDiscount: 0,
      ...(rewardId ? { rewardId } : {}),
      snapshot: promotionSnapshot(discountPromotion),
    });
  }

  const shippingPromotions = await db.promotion.findMany({ where: { ...activeWhere, type: "FREE_SHIPPING" }, orderBy: { createdAt: "asc" } });
  for (const promotion of shippingPromotions) {
    if (!meetsMinimumOrder(input.merchandiseAmount, promotion.minOrderAmount) || !matchesShippingScope(promotion.shippingScope, input.city) || !(await ensureUsageAvailable(db, promotion, input.userId))) continue;
    const shippingDiscount = Math.max(0, Math.round(input.shippingFee));
    if (shippingDiscount === 0) break;
    applications.push({ promotionId: promotion.id, title: promotion.title, type: promotion.type, code: null, discountAmount: 0, shippingDiscount, snapshot: promotionSnapshot(promotion) });
    break;
  }

  return {
    promotionDiscount: applications.reduce((sum, item) => sum + item.discountAmount, 0),
    shippingDiscount: applications.reduce((sum, item) => sum + item.shippingDiscount, 0),
    applications,
    rewardId,
  };
}

export async function issueNextPurchaseRewards(db: DbLike, input: { orderId: string; userId: string; merchandiseAmount: number; paidAt?: Date }) {
  const paidAt = input.paidAt ?? new Date();
  const promotions = await db.promotion.findMany({
    where: { type: "NEXT_PURCHASE", isActive: true, startsAt: { lte: paidAt }, endsAt: { gte: paidAt } },
    orderBy: { createdAt: "asc" },
  });
  for (const promotion of promotions) {
    if (!promotion.discountType || promotion.discountValue === null || !promotion.rewardExpiresDays || !meetsMinimumOrder(input.merchandiseAmount, promotion.minOrderAmount)) continue;
    const issuedCount = await db.promotionReward.count({ where: { promotionId: promotion.id, userId: input.userId } });
    if (issuedCount >= promotion.perUserLimit) continue;
    const expiresAt = new Date(paidAt.getTime() + promotion.rewardExpiresDays * 86_400_000);
    await db.promotionReward.upsert({
      where: { promotionId_sourceOrderId: { promotionId: promotion.id, sourceOrderId: input.orderId } },
      update: {},
      create: {
        promotionId: promotion.id,
        userId: input.userId,
        sourceOrderId: input.orderId,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        maxDiscountAmount: promotion.maxDiscountAmount,
        expiresAt,
      },
    });
  }
}
