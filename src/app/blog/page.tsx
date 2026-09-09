import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArticleCard } from "@/components/article-card";
import { getActiveArticleCategories, getPublishedArticles } from "@/modules/articles/service";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";

export const dynamic = "force-dynamic";

type Context = { searchParams: Promise<{ page?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getGeneralStoreSettings();
  return {
    title: "وبلاگ",
    description: `تازه‌ترین مقالات و راهنماهای ${settings.storeName}`,
    alternates: { canonical: "/blog" },
  };
}

export default async function BlogIndexPage({ searchParams }: Context) {
  const { page } = await searchParams;
  const requestedPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const [{ items, page: current, totalPages, total }, categories] = await Promise.all([
    getPublishedArticles({ page: requestedPage }),
    getActiveArticleCategories(),
  ]);

  return (
    <main className="mx-auto w-[min(1200px,calc(100%-32px))] py-12 sm:py-16">
      <header className="mb-8 text-center">
        <h1 className="m-0 text-3xl font-bold text-[var(--brand-primary)] sm:text-4xl">وبلاگ</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--muted)]">مقالات، راهنمای خرید و تازه‌های فروشگاه</p>
      </header>

      {categories.length > 0 && (
        <nav className="mb-8 flex flex-wrap justify-center gap-2" aria-label="دسته‌های وبلاگ">
          <span className="rounded-full bg-[var(--brand-primary)] px-3.5 py-1.5 text-xs font-bold text-[var(--brand-primary-foreground)]">همه</span>
          {categories.map((category) => (
            <Link key={category.slug} href={`/blog/category/${category.slug}`} className="rounded-full border border-[var(--border)] px-3.5 py-1.5 text-xs font-bold text-[var(--foreground)] transition hover:border-[var(--brand-accent)]">
              {category.name}
            </Link>
          ))}
        </nav>
      )}

      {items.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((article) => <ArticleCard key={article.id} article={article} />)}
          </div>
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3 text-sm">
              {current > 1
                ? <Link href={`/blog?page=${current - 1}`} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 font-bold"><ChevronRight size={15} />صفحهٔ قبل</Link>
                : <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--muted)]"><ChevronRight size={15} />صفحهٔ قبل</span>}
              <span className="text-[var(--muted)]">صفحهٔ {current.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}</span>
              {current < totalPages
                ? <Link href={`/blog?page=${current + 1}`} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 font-bold">صفحهٔ بعد<ChevronLeft size={15} /></Link>
                : <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--muted)]">صفحهٔ بعد<ChevronLeft size={15} /></span>}
            </div>
          )}
        </>
      ) : (
        <p className="py-16 text-center text-sm text-[var(--muted)]">{total === 0 ? "هنوز مقاله‌ای منتشر نشده است." : "مقاله‌ای در این صفحه نیست."}</p>
      )}
    </main>
  );
}
