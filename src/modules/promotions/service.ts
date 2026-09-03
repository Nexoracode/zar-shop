import type { Prisma, PrismaClient } from "@generated/prisma/client";
import { calculatePromotionDiscount, eligibleAmountForScope, matchesShippingScope, meetsMinimumOrder, type PromotionScopeLine } from "@/modules/promotions/rules";
import { collectCategoryAndDescendantIds } from "@/modules/categories/category-tree";

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

/** `isActive` and within the validity window — the base filter for every active-promotion query. */
function activeWindow(now: Date) {
  return { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } } as const;
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

/** Whether a promotion targeted at specific users may be used by `userId`. */
function audienceAllows(promotion: { audienceScope: string; targetUserIds: unknown }, userId: string) {
  if (promotion.audienceScope !== "SPECIFIC_USERS") return true;
  return asStringArray(promotion.targetUserIds).includes(userId);
}

type AppliedScope = {
  itemScope: string;
  targetProductIds: string[];
  targetCategoryIds: string[];
  audienceScope: string;
  targetUserIds: string[];
  discountBase: number | null;
};

function promotionSnapshot(promotion: {
  id: string; title: string; type: string; code: string | null; discountType: string | null; discountValue: unknown;
  minOrderAmount: unknown; maxDiscountAmount: unknown; startsAt: Date; endsAt: Date;
}, applied?: Partial<AppliedScope>) {
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
    itemScope: applied?.itemScope ?? "ALL",
    targetProductIds: applied?.targetProductIds ?? [],
    targetCategoryIds: applied?.targetCategoryIds ?? [],
    audienceScope: applied?.audienceScope ?? "ALL",
    targetUserIds: applied?.targetUserIds ?? [],
    discountBase: applied?.discountBase ?? null,
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
  lines?: PromotionScopeLine[];
  now?: Date;
}): Promise<CheckoutPromotionResult> {
  const now = input.now ?? new Date();
  const applications: CheckoutPromotion[] = [];
  let rewardId: string | null = null;
  const activeWhere = activeWindow(now);

  let categoryParents: { id: string; parentId: string | null }[] | null = null;
  async function expandCategories(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    categoryParents ??= await db.category.findMany({ select: { id: true, parentId: true } });
    const parents = categoryParents;
    const out = new Set<string>();
    for (const id of ids) for (const descendant of collectCategoryAndDescendantIds(id, parents)) out.add(descendant);
    return out;
  }

  /** The amount a scoped promotion's percent/fixed discount runs against, plus the resolved id lists. */
  async function resolveItemBase(row: { itemScope: string; targetProductIds: unknown; targetCategoryIds: unknown }) {
    const targetProductIds = asStringArray(row.targetProductIds);
    const targetCategoryIds = asStringArray(row.targetCategoryIds);
    const expanded = row.itemScope === "CATEGORIES" ? await expandCategories(targetCategoryIds) : new Set<string>();
    const base = eligibleAmountForScope(input.merchandiseAmount, input.lines, { itemScope: row.itemScope, targetProductIds }, expanded);
    return { targetProductIds, targetCategoryIds, base };
  }

  let discountPromotion: Awaited<ReturnType<typeof db.promotion.findFirst>> | null = null;
  let discountValue: { discountType: "PERCENT" | "FIXED"; discountValue: number; maxDiscountAmount: number | null } | null = null;
  let discountBase = input.merchandiseAmount;
  let discountScope: Partial<AppliedScope> | undefined;
  const normalizedCode = input.couponCode?.trim().toUpperCase() || null;

  if (normalizedCode) {
    const coupon = await db.promotion.findFirst({ where: { ...activeWhere, type: "COUPON", code: normalizedCode } });
    if (!coupon) throw new PromotionValidationError("کد تخفیف معتبر یا فعال نیست.");
    if (!audienceAllows(coupon, input.userId)) throw new PromotionValidationError("کد تخفیف معتبر یا فعال نیست.");
    if (!meetsMinimumOrder(input.merchandiseAmount, coupon.minOrderAmount)) throw new PromotionValidationError("حداقل مبلغ لازم برای استفاده از این کد تخفیف تأمین نشده است.");
    if (!(await ensureUsageAvailable(db, coupon, input.userId))) throw new PromotionValidationError("ظرفیت استفاده از این کد تخفیف به پایان رسیده است.");
    if (!coupon.discountType || coupon.discountValue === null) throw new PromotionValidationError("تنظیمات کد تخفیف کامل نیست.");
    const scoped = await resolveItemBase(coupon);
    if (scoped.base <= 0) throw new PromotionValidationError("این کد تخفیف برای اقلام سبد شما فعال نیست.");
    discountPromotion = coupon;
    discountValue = { discountType: coupon.discountType, discountValue: Number(coupon.discountValue), maxDiscountAmount: coupon.maxDiscountAmount === null ? null : Number(coupon.maxDiscountAmount) };
    discountBase = scoped.base;
    discountScope = { itemScope: coupon.itemScope, targetProductIds: scoped.targetProductIds, targetCategoryIds: scoped.targetCategoryIds, audienceScope: coupon.audienceScope, targetUserIds: asStringArray(coupon.targetUserIds), discountBase: scoped.base };
  } else {
    const reward = await db.promotionReward.findFirst({
      where: { userId: input.userId, redeemedOrderId: null, expiresAt: { gte: now } },
      include: { promotion: true },
      orderBy: { expiresAt: "asc" },
    });
    const rewardScoped = reward ? await resolveItemBase(reward) : null;
    if (reward && rewardScoped && rewardScoped.base > 0 && meetsMinimumOrder(input.merchandiseAmount, reward.promotion.minOrderAmount)) {
      discountPromotion = reward.promotion;
      discountValue = { discountType: reward.discountType, discountValue: Number(reward.discountValue), maxDiscountAmount: reward.maxDiscountAmount === null ? null : Number(reward.maxDiscountAmount) };
      rewardId = reward.id;
      discountBase = rewardScoped.base;
      discountScope = { itemScope: reward.itemScope, targetProductIds: rewardScoped.targetProductIds, targetCategoryIds: rewardScoped.targetCategoryIds, audienceScope: "ALL", targetUserIds: [], discountBase: rewardScoped.base };
    } else {
      const hasPaidOrder = await db.order.findFirst({ where: { userId: input.userId, status: { in: [...paidOrderStatuses] } }, select: { id: true } });
      if (!hasPaidOrder) {
        const firstPurchasePromotions = await db.promotion.findMany({ where: { ...activeWhere, type: "FIRST_PURCHASE" }, orderBy: { createdAt: "asc" } });
        for (const promotion of firstPurchasePromotions) {
          if (!audienceAllows(promotion, input.userId)) continue;
          if (!meetsMinimumOrder(input.merchandiseAmount, promotion.minOrderAmount) || !(await ensureUsageAvailable(db, promotion, input.userId))) continue;
          if (!promotion.discountType || promotion.discountValue === null) continue;
          const scoped = await resolveItemBase(promotion);
          if (scoped.base <= 0) continue;
          discountPromotion = promotion;
          discountValue = { discountType: promotion.discountType, discountValue: Number(promotion.discountValue), maxDiscountAmount: promotion.maxDiscountAmount === null ? null : Number(promotion.maxDiscountAmount) };
          discountBase = scoped.base;
          discountScope = { itemScope: promotion.itemScope, targetProductIds: scoped.targetProductIds, targetCategoryIds: scoped.targetCategoryIds, audienceScope: promotion.audienceScope, targetUserIds: asStringArray(promotion.targetUserIds), discountBase: scoped.base };
          break;
        }
      }
    }
  }

  if (discountPromotion && discountValue) {
    const discountAmount = calculatePromotionDiscount(discountBase, discountValue);
    if (discountAmount > 0) applications.push({
      promotionId: discountPromotion.id,
      title: discountPromotion.title,
      type: discountPromotion.type,
      code: discountPromotion.code,
      discountAmount,
      shippingDiscount: 0,
      ...(rewardId ? { rewardId } : {}),
      snapshot: promotionSnapshot(discountPromotion, discountScope),
    });
  }

  const shippingPromotions = await db.promotion.findMany({ where: { ...activeWhere, type: "FREE_SHIPPING" }, orderBy: { createdAt: "asc" } });
  for (const promotion of shippingPromotions) {
    if (!audienceAllows(promotion, input.userId)) continue;
    if (!meetsMinimumOrder(input.merchandiseAmount, promotion.minOrderAmount) || !matchesShippingScope(promotion.shippingScope, input.city) || !(await ensureUsageAvailable(db, promotion, input.userId))) continue;
    const shippingDiscount = Math.max(0, Math.round(input.shippingFee));
    if (shippingDiscount === 0) break;
    applications.push({ promotionId: promotion.id, title: promotion.title, type: promotion.type, code: null, discountAmount: 0, shippingDiscount, snapshot: promotionSnapshot(promotion, { audienceScope: promotion.audienceScope, targetUserIds: asStringArray(promotion.targetUserIds) }) });
    break;
  }

  return {
    promotionDiscount: applications.reduce((sum, item) => sum + item.discountAmount, 0),
    shippingDiscount: applications.reduce((sum, item) => sum + item.shippingDiscount, 0),
    applications,
    rewardId,
  };
}

/**
 * Active promotions of `type` that `userId` currently qualifies for, ignoring cart-dependent
 * checks (minimum order, item scope) that can't be evaluated outside checkout. Used to tell a
 * fresh account which FIRST_PURCHASE offers are waiting for them.
 */
export async function listQualifyingPromotions(db: DbLike, input: { userId: string; type: "FIRST_PURCHASE"; now?: Date }) {
  const now = input.now ?? new Date();
  const hasPaidOrder = await db.order.findFirst({ where: { userId: input.userId, status: { in: [...paidOrderStatuses] } }, select: { id: true } });
  if (hasPaidOrder) return [];
  const candidates = await db.promotion.findMany({ where: { ...activeWindow(now), type: input.type }, orderBy: { createdAt: "asc" } });
  const qualifying: typeof candidates = [];
  for (const promotion of candidates) {
    if (!audienceAllows(promotion, input.userId)) continue;
    if (!promotion.discountType || promotion.discountValue === null) continue;
    if (!(await ensureUsageAvailable(db, promotion, input.userId))) continue;
    qualifying.push(promotion);
  }
  return qualifying;
}

export type IssuedReward = {
  rewardId: string;
  promotionId: string;
  promotionTitle: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  maxDiscountAmount: number | null;
  expiresAt: Date;
};

export async function issueNextPurchaseRewards(db: DbLike, input: { orderId: string; userId: string; merchandiseAmount: number; paidAt?: Date }): Promise<IssuedReward[]> {
  const paidAt = input.paidAt ?? new Date();
  const promotions = await db.promotion.findMany({
    where: { type: "NEXT_PURCHASE", isActive: true, startsAt: { lte: paidAt }, endsAt: { gte: paidAt } },
    orderBy: { createdAt: "asc" },
  });
  if (promotions.length === 0) return [];
  const alreadyIssued = new Set(
    (await db.promotionReward.findMany({ where: { sourceOrderId: input.orderId }, select: { promotionId: true } })).map((row) => row.promotionId),
  );
  const issued: IssuedReward[] = [];
  for (const promotion of promotions) {
    if (!promotion.discountType || promotion.discountValue === null || !promotion.rewardExpiresDays || !meetsMinimumOrder(input.merchandiseAmount, promotion.minOrderAmount)) continue;
    if (!audienceAllows(promotion, input.userId)) continue;
    if (alreadyIssued.has(promotion.id)) continue;
    const issuedCount = await db.promotionReward.count({ where: { promotionId: promotion.id, userId: input.userId } });
    if (issuedCount >= promotion.perUserLimit) continue;
    const expiresAt = new Date(paidAt.getTime() + promotion.rewardExpiresDays * 86_400_000);
    try {
      const reward = await db.promotionReward.create({
        data: {
          itemScope: promotion.itemScope,
          targetProductIds: asStringArray(promotion.targetProductIds),
          targetCategoryIds: asStringArray(promotion.targetCategoryIds),
          promotionId: promotion.id,
          userId: input.userId,
          sourceOrderId: input.orderId,
          discountType: promotion.discountType,
          discountValue: promotion.discountValue,
          maxDiscountAmount: promotion.maxDiscountAmount,
          expiresAt,
        },
      });
      issued.push({
        rewardId: reward.id,
        promotionId: promotion.id,
        promotionTitle: promotion.title,
        discountType: promotion.discountType,
        discountValue: Number(promotion.discountValue),
        maxDiscountAmount: promotion.maxDiscountAmount === null ? null : Number(promotion.maxDiscountAmount),
        expiresAt,
      });
    } catch (error) {
      // A concurrent finalization already created the row for this [promotionId, sourceOrderId].
      if (!isUniqueViolation(error)) throw error;
    }
  }
  return issued;
}
