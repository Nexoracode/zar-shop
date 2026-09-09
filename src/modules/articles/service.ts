import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@generated/prisma/client";

export { ARTICLE_BASE_PATH, articlePath, articleCategoryPath, articleUrl } from "./paths";

const listSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  coverMedia: { select: { url: true, alt: true, width: true, height: true } },
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ArticleSelect;

export type ArticleListItem = Prisma.ArticleGetPayload<{ select: typeof listSelect }>;

const ARTICLES_PAGE_SIZE = 12;

function publishedWhere(now = new Date()): Prisma.ArticleWhereInput {
  return { status: "PUBLISHED", publishedAt: { not: null, lte: now } };
}

export async function getPublishedArticles({ page = 1, categorySlug }: { page?: number; categorySlug?: string }) {
  const where: Prisma.ArticleWhereInput = {
    ...publishedWhere(),
    ...(categorySlug ? { category: { slug: categorySlug, isActive: true } } : {}),
  };
  const total = await db.article.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / ARTICLES_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);
  const items = await db.article.findMany({
    where,
    select: listSelect,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    skip: (current - 1) * ARTICLES_PAGE_SIZE,
    take: ARTICLES_PAGE_SIZE,
  });
  return { items, page: current, totalPages, total, pageSize: ARTICLES_PAGE_SIZE };
}

export async function getPublishedArticleBySlug(slug: string) {
  const article = await db.article.findFirst({
    where: { slug, ...publishedWhere() },
    include: { coverMedia: true, category: { select: { name: true, slug: true, isActive: true } } },
  });
  if (!article) return null;
  const related = await db.article.findMany({
    where: {
      ...publishedWhere(),
      id: { not: article.id },
      ...(article.categoryId ? { categoryId: article.categoryId } : {}),
    },
    select: listSelect,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 3,
  });
  return { article, related };
}

export async function getActiveArticleCategories() {
  return db.articleCategory.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true, slug: true } });
}
