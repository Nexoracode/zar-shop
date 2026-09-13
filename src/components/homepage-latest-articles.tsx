import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ArticleCard } from "@/components/article-card";
import type { ArticleListItem } from "@/modules/articles/service";

export function HomepageLatestArticles({ articles, className = "" }: { articles: ArticleListItem[]; className?: string }) {
  if (!articles.length) return null;
  return (
    <div className={className}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="m-0 text-xl font-bold text-[var(--foreground)] sm:text-2xl">آخرین مقالات</h2>
          <p className="mb-0 mt-1 text-xs text-[var(--muted)] sm:text-sm">راهنما، اخبار و مطالب تازهٔ وبلاگ</p>
        </div>
        <Link href="/blog" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[var(--foreground)] transition hover:text-[var(--brand-accent)]">
          مشاهده وبلاگ<ChevronLeft size={15} />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {articles.map((article) => <ArticleCard key={article.id} article={article} />)}
      </div>
    </div>
  );
}
