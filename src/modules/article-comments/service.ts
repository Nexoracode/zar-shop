import "server-only";
import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";

export type StorefrontArticleComment = {
  id: string;
  parentId: string | null;
  body: string;
  status: "PENDING" | "APPROVED";
  createdAt: string;
  author: { name: string; isManagement: boolean };
  votes: { likes: number; dislikes: number; current: -1 | 0 | 1 };
  isOwn: boolean;
  replies: StorefrontArticleComment[];
};

const visibleCommentSelect = {
  id: true,
  parentId: true,
  body: true,
  status: true,
  createdAt: true,
  userId: true,
  user: { select: { firstName: true, lastName: true, role: true } },
} satisfies Prisma.ArticleCommentSelect;

type VisibleCommentRow = Prisma.ArticleCommentGetPayload<{ select: typeof visibleCommentSelect }>;

function authorName(comment: VisibleCommentRow) {
  return `${comment.user.firstName ?? ""} ${comment.user.lastName ?? ""}`.trim() || "کاربر";
}

function serializeComment(comment: VisibleCommentRow, viewerId: string | null, votes: { likes: number; dislikes: number; current: number }): StorefrontArticleComment {
  return {
    id: comment.id,
    parentId: comment.parentId,
    body: comment.body,
    status: comment.status as "PENDING" | "APPROVED",
    createdAt: comment.createdAt.toISOString(),
    author: { name: authorName(comment), isManagement: comment.user.role !== "CUSTOMER" },
    votes: { likes: votes.likes, dislikes: votes.dislikes, current: votes.current === 1 ? 1 : votes.current === -1 ? -1 : 0 },
    isOwn: comment.userId === viewerId,
    replies: [],
  };
}

export async function getStorefrontArticleComments(articleId: string, viewerId: string | null): Promise<StorefrontArticleComment[]> {
  const visibility: Prisma.ArticleCommentWhereInput[] = [{ status: "APPROVED" }];
  if (viewerId) visibility.push({ userId: viewerId, status: "PENDING" });
  const rows = await db.articleComment.findMany({
    where: { articleId, OR: visibility },
    select: visibleCommentSelect,
    orderBy: [{ createdAt: "desc" }],
  });
  const commentIds = rows.map((row) => row.id);
  const [voteCounts, currentVotes] = await Promise.all([
    commentIds.length ? db.articleCommentVote.groupBy({ by: ["commentId", "value"], where: { commentId: { in: commentIds } }, _count: { value: true } }) : Promise.resolve([]),
    viewerId && commentIds.length ? db.articleCommentVote.findMany({ where: { userId: viewerId, commentId: { in: commentIds } }, select: { commentId: true, value: true } }) : Promise.resolve([]),
  ]);
  const voteMap = new Map<string, { likes: number; dislikes: number; current: number }>(commentIds.map((id) => [id, { likes: 0, dislikes: 0, current: 0 }]));
  for (const vote of voteCounts) {
    const item = voteMap.get(vote.commentId);
    if (!item) continue;
    if (vote.value === 1) item.likes = vote._count.value;
    if (vote.value === -1) item.dislikes = vote._count.value;
  }
  for (const vote of currentVotes) {
    const item = voteMap.get(vote.commentId);
    if (item) item.current = vote.value;
  }
  const items = rows.map((row) => serializeComment(row, viewerId, voteMap.get(row.id) ?? { likes: 0, dislikes: 0, current: 0 }));
  const byId = new Map(items.map((item) => [item.id, item]));
  const roots: StorefrontArticleComment[] = [];
  for (const item of items) {
    const parent = item.parentId ? byId.get(item.parentId) : null;
    if (parent) parent.replies.push(item);
    else if (!item.parentId) roots.push(item);
  }
  for (const item of items) item.replies.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  return roots;
}
