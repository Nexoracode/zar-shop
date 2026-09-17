import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { ArticleListSection } from "@/components/article-list-section";
import { db } from "@/lib/db";
import { getActiveArticleCategories, getPublishedArticles } from "@/modules/articles/service";

type Context = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string; search?: string }> };

async function getCategory(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles:list");
  return db.articleCategory.findFirst({ where: { slug, isActive: true }, select: { name: true, slug: true } });
}

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return {};
  return { title: `وبلاگ · ${category.name}`, alternates: { canonical: `/blog/category/${category.slug}` } };
}

export default async function BlogCategoryPage({ params, searchParams }: Context) {
  // getPublishedArticles is an uncached raw DB read (see its own comment); mark this render
  // as request-time explicitly so Next doesn't attempt to prerender through it.
  await connection();
  const [{ slug }, { page, search }] = await Promise.all([params, searchParams]);
  const category = await getCategory(slug);
  if (!category) notFound();

  const requestedPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const trimmedSearch = search?.trim() ?? "";
  const [{ items, page: current, totalPages, total }, categories] = await Promise.all([
    getPublishedArticles({ page: requestedPage, categorySlug: slug, search: trimmedSearch }),
    getActiveArticleCategories(),
  ]);

  return (
    <main className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto w-[min(1200px,100%)]">
        <nav className="mb-4 flex items-center gap-2 text-xs text-[var(--muted)]" aria-label="مسیر">
          <Link href="/blog" className="hover:text-[var(--foreground)]">وبلاگ</Link><span>/</span><span>{category.name}</span>
        </nav>
        <h1 className="m-0 mb-8 text-2xl font-bold text-[var(--brand-primary)] sm:text-3xl">{category.name}</h1>

        <ArticleListSection
          items={items}
          page={current}
          totalPages={totalPages}
          total={total}
          categories={categories}
          activeCategorySlug={slug}
          search={trimmedSearch}
          basePath={`/blog/category/${slug}`}
          extraParams={{ search: trimmedSearch || undefined }}
        />
      </div>
    </main>
  );
}
