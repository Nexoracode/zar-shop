import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleFeaturedSection } from "@/components/article-featured-section";
import { ArticleListSection } from "@/components/article-list-section";
import { getActiveArticleCategories, getFeaturedArticles, getPublishedArticles } from "@/modules/articles/service";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";

export const dynamic = "force-dynamic";

type Context = { searchParams: Promise<{ page?: string; search?: string; category?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getGeneralStoreSettings();
  return {
    title: "وبلاگ",
    description: `تازه‌ترین مقالات و راهنماهای ${settings.storeName}`,
    alternates: { canonical: "/blog" },
  };
}

export default async function BlogIndexPage({ searchParams }: Context) {
  const { page, search, category } = await searchParams;
  const requestedPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const trimmedSearch = search?.trim() ?? "";

  const categories = await getActiveArticleCategories();
  if (category && !categories.some((item) => item.slug === category)) notFound();

  const [{ items, page: current, totalPages, total }, featured] = await Promise.all([
    getPublishedArticles({ page: requestedPage, categorySlug: category, search: trimmedSearch }),
    requestedPage === 1 && !trimmedSearch && !category ? getFeaturedArticles(4) : Promise.resolve([]),
  ]);

  return (
    <main className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto w-[min(1200px,100%)]">
        <header className="mb-8 text-center sm:mb-10">
          <h1 className="m-0 text-3xl font-bold text-[var(--brand-primary)] sm:text-4xl">وبلاگ</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--muted)]">مقالات، راهنمای خرید و تازه‌های فروشگاه</p>
        </header>

        {featured.length > 0 && <ArticleFeaturedSection articles={featured} />}

        <ArticleListSection
          items={items}
          page={current}
          totalPages={totalPages}
          total={total}
          categories={categories}
          activeCategorySlug={category}
          search={trimmedSearch}
          basePath="/blog"
          extraParams={{ search: trimmedSearch || undefined, category }}
        />
      </div>
    </main>
  );
}
