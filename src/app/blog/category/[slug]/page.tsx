import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArticleCard } from "@/components/article-card";
import { BlogCategorySidebar } from "@/components/blog-category-sidebar";
import { db } from "@/lib/db";
import { countPublishedArticles, getActiveArticleCategories, getPublishedArticles } from "@/modules/articles/service";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

async function getCategory(slug: string) {
  return db.articleCategory.findFirst({ where: { slug, isActive: true }, select: { name: true, slug: true } });
}

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return {};
  return { title: `وبلاگ · ${category.name}`, alternates: { canonical: `/blog/category/${category.slug}` } };
}

export default async function BlogCategoryPage({ params, searchParams }: Context) {
  const [{ slug }, { page }] = await Promise.all([params, searchParams]);
  const category = await getCategory(slug);
  if (!category) notFound();

  const requestedPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const [{ items, page: current, totalPages }, categories, totalCount] = await Promise.all([
    getPublishedArticles({ page: requestedPage, categorySlug: slug }),
    getActiveArticleCategories(),
    countPublishedArticles(),
  ]);

  return (
    <main className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto w-[min(1200px,100%)]">
        <nav className="mb-4 flex items-center gap-2 text-xs text-[var(--muted)]" aria-label="مسیر">
          <Link href="/blog" className="hover:text-[var(--foreground)]">وبلاگ</Link><span>/</span><span>{category.name}</span>
        </nav>
        <h1 className="m-0 mb-8 text-2xl font-bold text-[var(--brand-primary)] sm:text-3xl">{category.name}</h1>

        {categories.length > 0 && (
          <nav className="mb-6 flex flex-wrap gap-2 lg:hidden" aria-label="دسته‌های وبلاگ">
            <Link href="/blog" className="rounded-full border border-[var(--border)] px-3.5 py-1.5 text-xs font-bold text-[var(--foreground)] transition hover:border-[var(--brand-accent)]">همه</Link>
            {categories.map((item) => (
              <Link
                key={item.slug}
                href={`/blog/category/${item.slug}`}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${item.slug === slug ? "bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--brand-accent)]"}`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <BlogCategorySidebar categories={categories} totalCount={totalCount} activeSlug={slug} />
          </div>

          <section aria-label="فهرست مقالات این دسته">
            {items.length ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((article) => <ArticleCard key={article.id} article={article} />)}
                </div>
                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-3 text-sm">
                    {current > 1
                      ? <Link href={`/blog/category/${slug}?page=${current - 1}`} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 font-bold"><ChevronRight size={15} />صفحهٔ قبل</Link>
                      : <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--muted)]"><ChevronRight size={15} />صفحهٔ قبل</span>}
                    <span className="text-[var(--muted)]">صفحهٔ {current.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}</span>
                    {current < totalPages
                      ? <Link href={`/blog/category/${slug}?page=${current + 1}`} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 font-bold">صفحهٔ بعد<ChevronLeft size={15} /></Link>
                      : <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--muted)]">صفحهٔ بعد<ChevronLeft size={15} /></span>}
                  </div>
                )}
              </>
            ) : (
              <p className="rounded-2xl border border-dashed border-[var(--border)] py-16 text-center text-sm text-[var(--muted)]">در این دسته هنوز مقاله‌ای منتشر نشده است.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
