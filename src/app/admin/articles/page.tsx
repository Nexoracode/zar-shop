import type { Prisma, ArticleStatus } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { requirePermission } from "@/modules/auth/session";
import { BlueprintArticlesView } from "@/components/admin/blueprint/articles-view";

type Context = { searchParams: Promise<{ q?: string; status?: string; category?: string; page?: string; pageSize?: string }> };

const statuses = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export default async function AdminArticlesPage({ searchParams }: Context) {
  await requirePermission("settings:manage");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = statuses.includes(params.status as ArticleStatus) ? (params.status as ArticleStatus) : undefined;
  const categoryId = params.category || undefined;
  const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);

  const where: Prisma.ArticleWhereInput = {
    ...(query ? { OR: [{ title: { contains: query } }, { slug: { contains: query } }] } : {}),
    ...(status ? { status } : {}),
    ...(categoryId ? { categoryId } : {}),
  };

  const filteredTotal = await db.article.count({ where });
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const [articles, categories, total, published, drafts] = await Promise.all([
    db.article.findMany({
      where,
      skip: pagination.skip,
      take: pagination.pageSize,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true, title: true, slug: true, status: true, publishedAt: true, createdAt: true,
        coverMedia: { select: { url: true, alt: true } },
        category: { select: { name: true } },
      },
    }),
    db.articleCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.article.count(),
    db.article.count({ where: { status: "PUBLISHED" } }),
    db.article.count({ where: { status: "DRAFT" } }),
  ]);

  return (
    <BlueprintArticlesView
      articles={articles.map((article) => ({
        ...article,
        publishedAt: article.publishedAt?.toISOString() ?? null,
        createdAt: article.createdAt.toISOString(),
      }))}
      categories={categories}
      counts={{ total, published, drafts }}
      filters={{ query, status: status ?? "", category: categoryId ?? "" }}
      pagination={pagination}
    />
  );
}
