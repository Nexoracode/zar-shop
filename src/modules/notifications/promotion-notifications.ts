import type { Prisma, PrismaClient, Promotion } from "@generated/prisma/client";
import { formatDate, formatMoney } from "@/lib/format";
import { collectCategoryAndDescendantIds } from "@/modules/categories/category-tree";
import { getCommunicationSettings } from "@/modules/communications/communication-settings";
import { listQualifyingPromotions, type IssuedReward } from "@/modules/promotions/service";
import { createBroadcast, createNotification, notifyUsers, NOTIFY_MAX_RECIPIENTS } from "@/modules/notifications/service";

type DbLike = PrismaClient | Prisma.TransactionClient;

type PromotionRow = Pick<
  Promotion,
  | "id" | "title" | "type" | "code" | "discountType" | "discountValue"
  | "isActive" | "announceInApp" | "audienceScope" | "itemScope"
  | "targetUserIds" | "targetProductIds" | "targetCategoryIds" | "endsAt"
>;

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function discountPhrase(promotion: { discountType: string | null; discountValue: unknown }): string {
  if (!promotion.discountType || promotion.discountValue == null) return "تخفیف";
  const amount = Number(promotion.discountValue);
  return promotion.discountType === "PERCENT" ? `${amount.toLocaleString("fa-IR")}٪ تخفیف` : `${formatMoney(amount)} تخفیف`;
}

const until = (endsAt: Date) => `تا ${formatDate(endsAt)}`;

// Notification bodies are plain text (no `dir="ltr"` span available), so an LTR token like a
// coupon code needs Unicode bidi isolates to keep the surrounding Persian punctuation in place.
const LEFT_TO_RIGHT_ISOLATE = "⁦";
const POP_DIRECTIONAL_ISOLATE = "⁩";

function isolateLtr(value: string): string {
  return `${LEFT_TO_RIGHT_ISOLATE}${value}${POP_DIRECTIONAL_ISOLATE}`;
}

function couponBody(promotion: PromotionRow): string {
  const code = promotion.code ? `با کد «${isolateLtr(promotion.code)}»، ` : "";
  return `${code}${discountPhrase(promotion)} ${until(promotion.endsAt)} معتبر است.`;
}

async function inAppEnabled() {
  return (await getCommunicationSettings()).inAppEnabled;
}

async function filterNonGuest(db: DbLike, userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const rows = await db.user.findMany({ where: { id: { in: userIds }, isGuest: false }, select: { id: true } });
  return rows.map((row) => row.id);
}

async function resolveInterestedUserIds(db: DbLike, input: { productIds: string[]; categoryIds: string[] }): Promise<string[]> {
  const productIds = new Set(input.productIds);
  if (input.categoryIds.length > 0) {
    const categories = await db.category.findMany({ select: { id: true, parentId: true } });
    const expanded = new Set<string>();
    for (const id of input.categoryIds) for (const descendant of collectCategoryAndDescendantIds(id, categories)) expanded.add(descendant);
    const products = await db.product.findMany({ where: { categoryId: { in: [...expanded] } }, select: { id: true }, take: NOTIFY_MAX_RECIPIENTS });
    for (const product of products) productIds.add(product.id);
  }
  if (productIds.size === 0) return [];
  const favorites = await db.productFavorite.findMany({
    where: { productId: { in: [...productIds] }, user: { isGuest: false } },
    select: { userId: true },
    distinct: ["userId"],
    take: NOTIFY_MAX_RECIPIENTS,
  });
  return favorites.map((favorite) => favorite.userId);
}

/** On signup: tell the fresh account which active FIRST_PURCHASE offers (with the switch on) await it. */
export async function notifyFirstPurchaseEligible(db: DbLike, input: { userId: string }) {
  if (!(await inAppEnabled())) return;
  const promotions = (await listQualifyingPromotions(db, { userId: input.userId, type: "FIRST_PURCHASE" })).filter((promotion) => promotion.announceInApp);
  for (const promotion of promotions) {
    await createNotification(db, input.userId, {
      type: "PROMOTION_FIRST_PURCHASE",
      title: "تخفیف خرید اول برای شما فعال شد",
      body: `${promotion.title}: ${discountPhrase(promotion)} روی نخستین سفارش شما ${until(promotion.endsAt)} معتبر است.`,
      ctaHref: "/products",
      promotionId: promotion.id,
      dedupeKey: `PROMOTION_FIRST_PURCHASE:${promotion.id}`,
      expiresAt: promotion.endsAt,
    });
  }
}

/** After a paid order: one notification per NEXT_PURCHASE voucher just issued for the buyer. */
export async function notifyNextPurchaseRewards(db: DbLike, input: { userId: string; isGuest: boolean; rewards: IssuedReward[] }) {
  if (input.isGuest || input.rewards.length === 0) return;
  if (!(await inAppEnabled())) return;
  for (const reward of input.rewards) {
    const phrase = reward.discountType === "PERCENT" ? `${reward.discountValue.toLocaleString("fa-IR")}٪` : formatMoney(reward.discountValue);
    await createNotification(db, input.userId, {
      type: "PROMOTION_NEXT_PURCHASE",
      title: "پاداش خرید بعدی دریافت کردید",
      body: `${reward.promotionTitle}: ${phrase} برای خرید بعدی شما، تا ${formatDate(reward.expiresAt)} معتبر است.`,
      ctaHref: "/products",
      promotionId: reward.promotionId,
      dedupeKey: `PROMOTION_NEXT_PURCHASE:${reward.rewardId}`,
      expiresAt: reward.expiresAt,
    });
  }
}

/** On promotion create / activate: route the announcement by audience and item scope. */
export async function notifyPromotionAudience(db: DbLike, promotion: PromotionRow) {
  if (!promotion.isActive || !promotion.announceInApp) return;
  if (!(await inAppEnabled())) return;

  if (promotion.audienceScope === "SPECIFIC_USERS") {
    const userIds = await filterNonGuest(db, stringArray(promotion.targetUserIds));
    await notifyUsers(
      db,
      userIds,
      {
        type: "PROMOTION_COUPON",
        title: "کد تخفیف ویژهٔ شما",
        body: couponBody(promotion),
        ctaHref: "/products",
        promotionId: promotion.id,
        expiresAt: promotion.endsAt,
      },
      `PROMOTION_COUPON:${promotion.id}`,
    );
    return;
  }

  if (promotion.type === "COUPON" && promotion.audienceScope === "ALL" && promotion.itemScope === "ALL") {
    await createBroadcast(db, {
      type: "PROMOTION_COUPON",
      title: "کد تخفیف جدید",
      body: couponBody(promotion),
      ctaHref: "/products",
      promotionId: promotion.id,
      expiresAt: promotion.endsAt,
    });
    return;
  }

  if (promotion.itemScope === "PRODUCTS" || promotion.itemScope === "CATEGORIES") {
    const userIds = await resolveInterestedUserIds(db, {
      productIds: stringArray(promotion.targetProductIds),
      categoryIds: stringArray(promotion.targetCategoryIds),
    });
    await notifyUsers(
      db,
      userIds,
      {
        type: "PROMOTION_PRODUCT",
        title: "تخفیف روی یکی از علاقه‌مندی‌های شما",
        body: `${promotion.title}: ${discountPhrase(promotion)} ${until(promotion.endsAt)}.`,
        ctaHref: "/products",
        promotionId: promotion.id,
        expiresAt: promotion.endsAt,
      },
      `PROMOTION_PRODUCT:${promotion.id}`,
    );
  }
}
