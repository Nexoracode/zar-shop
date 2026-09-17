import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleFeaturedSection } from "@/components/article-featured-section";
import { ArticleListSection } from "@/components/article-list-section";
import { getActiveArticleCategories, getFeaturedArticles, getPublishedArticles } from "@/modules/articles/service";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

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

  const [categories, settings] = await Promise.all([getActiveArticleCategories(), getGeneralStoreSettings()]);
  if (category && !categories.some((item) => item.slug === category)) notFound();

  const [{ items, page: current, totalPages, total }, featured] = await Promise.all([
    getPublishedArticles({ page: requestedPage, categorySlug: category, search: trimmedSearch }),
    requestedPage === 1 && !trimmedSearch && !category ? getFeaturedArticles(4) : Promise.resolve([]),
  ]);

  return (
    <main className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto w-[min(1200px,100%)]">
        <header className="mb-8 max-w-xl sm:mb-10">
          <h1 className="m-0 text-3xl font-bold text-[var(--brand-primary)] sm:text-4xl">وبلاگ {settings.storeName}</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">آخرین مقالات، راهنمای خرید و تازه‌های {settings.storeName} را اینجا دنبال کنید.</p>
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
