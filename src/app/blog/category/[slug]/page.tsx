import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArticleCard } from "@/components/article-card";
import { db } from "@/lib/db";
import { getPublishedArticles } from "@/modules/articles/service";

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
  const { items, page: current, totalPages } = await getPublishedArticles({ page: requestedPage, categorySlug: slug });

  return (
    <main className="mx-auto w-[min(1200px,calc(100%-32px))] py-12 sm:py-16">
      <nav className="mb-4 flex items-center gap-2 text-xs text-[var(--muted)]" aria-label="مسیر">
        <Link href="/blog" className="hover:text-[var(--foreground)]">وبلاگ</Link><span>/</span><span>{category.name}</span>
      </nav>
      <h1 className="m-0 mb-8 text-2xl font-bold text-[var(--brand-primary)] sm:text-3xl">{category.name}</h1>

      {items.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <p className="py-16 text-center text-sm text-[var(--muted)]">در این دسته هنوز مقاله‌ای منتشر نشده است.</p>
      )}
    </main>
  );
}
