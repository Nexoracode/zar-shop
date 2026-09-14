import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArticleRowCard } from "@/components/article-row-card";
import { ArticleSearchFilterBar } from "@/components/article-search-filter-bar";
import type { ArticleRowItem } from "@/modules/articles/service";

type Props = {
  items: ArticleRowItem[];
  page: number;
  totalPages: number;
  total: number;
  categories: Array<{ name: string; slug: string }>;
  activeCategorySlug?: string;
  search: string;
  basePath: string;
  /** Extra query params to carry across pagination links (e.g. `search`, and `category` only for `/blog`). */
  extraParams?: Record<string, string | undefined>;
};

/** Shared "همه مقالات" section (search + category pills + row list + pagination) used by both `/blog` and `/blog/category/[slug]`. */
export function ArticleListSection({ items, page, totalPages, total, categories, activeCategorySlug, search, basePath, extraParams = {} }: Props) {
  function pageHref(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(extraParams)) if (value) params.set(key, value);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  return (
    <section aria-label="فهرست مقالات">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="w-fit border-b-2 border-[var(--brand-accent)] pb-2 text-[18px] font-extrabold text-[var(--foreground)]">همه مقالات · {total.toLocaleString("fa-IR")} مقاله</div>
      </div>

      <ArticleSearchFilterBar categories={categories} activeCategorySlug={activeCategorySlug} initialSearch={search} />

      {items.length ? (
        <>
          <div className="grid grid-cols-2 border-r border-t border-[var(--border)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {items.map((article) => <ArticleRowCard key={article.id} article={article} />)}
          </div>
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3 text-sm">
              {page > 1
                ? <Link href={pageHref(page - 1)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 font-bold"><ChevronRight size={15} />صفحهٔ قبل</Link>
                : <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--muted)]"><ChevronRight size={15} />صفحهٔ قبل</span>}
              <span className="text-[var(--muted)]">صفحهٔ {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}</span>
              {page < totalPages
                ? <Link href={pageHref(page + 1)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 font-bold">صفحهٔ بعد<ChevronLeft size={15} /></Link>
                : <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--muted)]">صفحهٔ بعد<ChevronLeft size={15} /></span>}
            </div>
          )}
        </>
      ) : (
        <p className="rounded-2xl border border-dashed border-[var(--border)] py-16 text-center text-sm text-[var(--muted)]">
          {!search && !activeCategorySlug ? "هنوز مقاله‌ای منتشر نشده است." : "مقاله‌ای با این مشخصات پیدا نشد."}
        </p>
      )}
    </section>
  );
}
