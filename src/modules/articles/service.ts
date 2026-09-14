import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@generated/prisma/client";

export { ARTICLE_BASE_PATH, articlePath, articleCategoryPath, articleUrl } from "./paths";

const listSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  author: { select: { name: true } },
  ratingAverage: true,
  ratingCount: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  coverMedia: { select: { url: true, alt: true, width: true, height: true } },
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ArticleSelect;

export type ArticleListItem = Prisma.ArticleGetPayload<{ select: typeof listSelect }>;

const featuredSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  author: { select: { name: true } },
  publishedAt: true,
  createdAt: true,
  coverMedia: { select: { url: true, alt: true, width: true, height: true } },
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ArticleSelect;

export type FeaturedArticle = Prisma.ArticleGetPayload<{ select: typeof featuredSelect }>;

// Distinct from `listSelect` on purpose — this one adds `content` (needed for the row card's
// read-time estimate). `listSelect` stays lean because it's shared with the homepage feed
// (`getLatestPublishedArticles`) and the "related articles" query, neither of which should pull
// full article bodies.
const allArticlesSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  author: { select: { name: true } },
  publishedAt: true,
  createdAt: true,
  coverMedia: { select: { url: true, alt: true, width: true, height: true } },
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ArticleSelect;

export type ArticleRowItem = Prisma.ArticleGetPayload<{ select: typeof allArticlesSelect }>;

const ARTICLES_PAGE_SIZE = 12;

function publishedWhere(now = new Date()): Prisma.ArticleWhereInput {
  return { status: "PUBLISHED", publishedAt: { not: null, lte: now } };
}

export async function getPublishedArticles({ page = 1, categorySlug, search }: { page?: number; categorySlug?: string; search?: string }) {
  const trimmedSearch = search?.trim();
  const where: Prisma.ArticleWhereInput = {
    ...publishedWhere(),
    ...(categorySlug ? { category: { slug: categorySlug, isActive: true } } : {}),
    ...(trimmedSearch ? { OR: [{ title: { contains: trimmedSearch } }, { excerpt: { contains: trimmedSearch } }, { content: { contains: trimmedSearch } }] } : {}),
  };
  const total = await db.article.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / ARTICLES_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);
  const items = await db.article.findMany({
    where,
    select: allArticlesSelect,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    skip: (current - 1) * ARTICLES_PAGE_SIZE,
    take: ARTICLES_PAGE_SIZE,
  });
  return { items, page: current, totalPages, total, pageSize: ARTICLES_PAGE_SIZE };
}

// Mirrors `productSelect` in `src/modules/products/storefront-feed.ts` — the exact fields
// `calculateProductPrice`/`calculateDiscountedPrice` need, so the sidebar's related-product price
// is computed with the same logic as everywhere else, not re-derived.
const relatedProductSelect = {
  id: true,
  slug: true,
  name: true,
  storeIndustry: true,
  purity: true,
  weightGrams: true,
  makingFeeType: true,
  makingFeeValue: true,
  profitPercent: true,
  taxPercent: true,
  fixedPrice: true,
  discountType: true,
  discountValue: true,
  discountStartsAt: true,
  discountEndsAt: true,
  media: { orderBy: { position: "asc" as const }, take: 1, select: { media: { select: { type: true, url: true, alt: true } } } },
} satisfies Prisma.ProductSelect;

export type ArticleRelatedProduct = Prisma.ProductGetPayload<{ select: typeof relatedProductSelect }>;

export async function getPublishedArticleBySlug(slug: string, viewerId?: string | null) {
  const article = await db.article.findFirst({
    where: { slug, ...publishedWhere() },
    include: {
      coverMedia: true,
      category: { select: { name: true, slug: true, isActive: true } },
      author: { select: { id: true, name: true, bio: true, avatar: { select: { url: true, alt: true } } } },
      faqs: { orderBy: { sortOrder: "asc" } },
      relatedProduct: { select: relatedProductSelect },
    },
  });
  if (!article) return null;
  const [related, ownRating] = await Promise.all([
    db.article.findMany({
      where: {
        ...publishedWhere(),
        id: { not: article.id },
        ...(article.categoryId ? { categoryId: article.categoryId } : {}),
      },
      select: listSelect,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 3,
    }),
    viewerId
      ? db.articleRating.findUnique({ where: { articleId_userId: { articleId: article.id, userId: viewerId } }, select: { value: true } })
      : Promise.resolve(null),
  ]);
  return { article, related, viewerRating: ownRating?.value ?? null };
}

/** Upserts the reader's own score and recomputes the article's denormalized average/count. */
export async function rateArticle(articleId: string, userId: string, value: number) {
  return db.$transaction(async (tx) => {
    await tx.articleRating.upsert({
      where: { articleId_userId: { articleId, userId } },
      update: { value },
      create: { articleId, userId, value },
    });
    const aggregate = await tx.articleRating.aggregate({ where: { articleId }, _avg: { value: true }, _count: true });
    const average = aggregate._avg.value ?? 0;
    await tx.article.update({ where: { id: articleId }, data: { ratingAverage: average, ratingCount: aggregate._count } });
    return { average, count: aggregate._count };
  });
}

/** Lean read for the homepage's "latest articles" section — no count query, just the rows. */
export async function getLatestPublishedArticles(limit = 4) {
  return db.article.findMany({
    where: publishedWhere(),
    select: listSelect,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit,
  });
}

/** Top-of-page magazine showcase for the blog list — hero card + numbered picks, newest first. */
export async function getFeaturedArticles(limit = 4) {
  return db.article.findMany({
    where: publishedWhere(),
    select: featuredSelect,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit,
  });
}

export async function countPublishedArticles() {
  return db.article.count({ where: publishedWhere() });
}

export async function getActiveArticleCategories() {
  const categories = await db.articleCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { name: true, slug: true, _count: { select: { articles: { where: publishedWhere() } } } },
  });
  return categories.map((category) => ({ name: category.name, slug: category.slug, articleCount: category._count.articles }));
}
