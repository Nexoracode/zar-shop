import "server-only";
import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";

export type StorefrontReview = {
  id: string;
  parentId: string | null;
  rating: number | null;
  title: string | null;
  body: string;
  status: "PENDING" | "APPROVED";
  createdAt: string;
  author: { name: string; isVerifiedPurchase: boolean; isManagement: boolean };
  votes: { likes: number; dislikes: number; current: -1 | 0 | 1 };
  reportedByCurrentUser: boolean;
  isOwn: boolean;
  replies: StorefrontReview[];
};

export type StorefrontReviewData = {
  summary: { average: number; count: number; distribution: Record<1 | 2 | 3 | 4 | 5, number> };
  reviews: StorefrontReview[];
};

const visibleReviewSelect = {
  id: true,
  parentId: true,
  rating: true,
  title: true,
  body: true,
  status: true,
  isVerifiedPurchase: true,
  createdAt: true,
  userId: true,
  user: { select: { firstName: true, lastName: true, role: true } },
} satisfies Prisma.ProductReviewSelect;

type VisibleReviewRow = Prisma.ProductReviewGetPayload<{ select: typeof visibleReviewSelect }>;

function authorName(review: VisibleReviewRow) {
  return `${review.user.firstName ?? ""} ${review.user.lastName ?? ""}`.trim() || "کاربر";
}

function serializeReview(review: VisibleReviewRow, viewerId: string | null, votes: { likes: number; dislikes: number; current: number }, reported: boolean): StorefrontReview {
  return {
    id: review.id,
    parentId: review.parentId,
    rating: review.rating,
    title: review.title,
    body: review.body,
    status: review.status as "PENDING" | "APPROVED",
    createdAt: review.createdAt.toISOString(),
    author: {
      name: authorName(review),
      isVerifiedPurchase: review.isVerifiedPurchase,
      isManagement: review.user.role !== "CUSTOMER",
    },
    votes: { likes: votes.likes, dislikes: votes.dislikes, current: votes.current === 1 ? 1 : votes.current === -1 ? -1 : 0 },
    reportedByCurrentUser: reported,
    isOwn: review.userId === viewerId,
    replies: [],
  };
}

export async function getStorefrontProductReviews(productId: string, viewerId: string | null): Promise<StorefrontReviewData> {
  const visibility: Prisma.ProductReviewWhereInput[] = [{ status: "APPROVED" }];
  if (viewerId) visibility.push({ userId: viewerId, status: "PENDING" });
  const [rows, aggregate, grouped] = await Promise.all([
    db.productReview.findMany({
      where: { productId, OR: visibility },
      select: visibleReviewSelect,
      orderBy: [{ createdAt: "desc" }],
    }),
    db.productReview.aggregate({
      where: { productId, parentId: null, status: "APPROVED", rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    db.productReview.groupBy({
      by: ["rating"],
      where: { productId, parentId: null, status: "APPROVED", rating: { not: null } },
      _count: { rating: true },
    }),
  ]);
  const reviewIds = rows.map((row) => row.id);
  const [voteCounts, currentVotes, currentReports] = await Promise.all([
    reviewIds.length ? db.productReviewVote.groupBy({ by: ["reviewId", "value"], where: { reviewId: { in: reviewIds } }, _count: { value: true } }) : Promise.resolve([]),
    viewerId && reviewIds.length ? db.productReviewVote.findMany({ where: { userId: viewerId, reviewId: { in: reviewIds } }, select: { reviewId: true, value: true } }) : Promise.resolve([]),
    viewerId && reviewIds.length ? db.productReviewReport.findMany({ where: { userId: viewerId, reviewId: { in: reviewIds } }, select: { reviewId: true } }) : Promise.resolve([]),
  ]);
  const voteMap = new Map<string, { likes: number; dislikes: number; current: number }>(reviewIds.map((id) => [id, { likes: 0, dislikes: 0, current: 0 }]));
  for (const vote of voteCounts) {
    const item = voteMap.get(vote.reviewId);
    if (!item) continue;
    if (vote.value === 1) item.likes = vote._count.value;
    if (vote.value === -1) item.dislikes = vote._count.value;
  }
  for (const vote of currentVotes) {
    const item = voteMap.get(vote.reviewId);
    if (item) item.current = vote.value;
  }
  const reportedIds = new Set(currentReports.map((report) => report.reviewId));
  const items = rows.map((row) => serializeReview(row, viewerId, voteMap.get(row.id) ?? { likes: 0, dislikes: 0, current: 0 }, reportedIds.has(row.id)));
  const byId = new Map(items.map((item) => [item.id, item]));
  const roots: StorefrontReview[] = [];
  for (const item of items) {
    const parent = item.parentId ? byId.get(item.parentId) : null;
    if (parent) parent.replies.push(item);
    else if (!item.parentId) roots.push(item);
  }
  for (const item of items) item.replies.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } satisfies Record<1 | 2 | 3 | 4 | 5, number>;
  for (const item of grouped) if (item.rating && item.rating >= 1 && item.rating <= 5) distribution[item.rating as 1 | 2 | 3 | 4 | 5] = item._count.rating;
  return {
    summary: { average: aggregate._avg.rating ?? 0, count: aggregate._count.rating, distribution },
    reviews: roots,
  };
}

export async function hasPurchasedProduct(userId: string, productId: string) {
  return Boolean(await db.orderItem.findFirst({
    where: { productId, order: { userId, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } } },
    select: { id: true },
  }));
}
