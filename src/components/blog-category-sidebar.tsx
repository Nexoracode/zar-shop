import Link from "next/link";
import { LayoutList } from "lucide-react";
import { articleCategoryPath } from "@/modules/articles/paths";

type Category = { name: string; slug: string; articleCount: number };

export function BlogCategorySidebar({ categories, totalCount, activeSlug }: { categories: Category[]; totalCount: number; activeSlug?: string }) {
  if (!categories.length) return null;
  return (
    <aside className="sticky top-[var(--storefront-sticky-offset,112px)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm" aria-label="دسته‌بندی‌های وبلاگ">
      <h2 className="m-0 mb-3 flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
        <LayoutList size={16} className="text-[var(--brand-accent)]" />دسته‌بندی‌ها
      </h2>
      <nav className="grid gap-1">
        <Link
          href="/blog"
          aria-current={!activeSlug ? "page" : undefined}
          className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${!activeSlug ? "bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "text-[var(--foreground)] hover:bg-[var(--surface-secondary)]"}`}
        >
          <span>همهٔ مقالات</span>
          <span className={!activeSlug ? "opacity-80" : "text-[var(--muted)]"}>{totalCount.toLocaleString("fa-IR")}</span>
        </Link>
        {categories.map((category) => {
          const active = category.slug === activeSlug;
          return (
            <Link
              key={category.slug}
              href={articleCategoryPath(category.slug)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${active ? "bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "text-[var(--foreground)] hover:bg-[var(--surface-secondary)]"}`}
            >
              <span className="truncate">{category.name}</span>
              <span className={active ? "opacity-80" : "text-[var(--muted)]"}>{category.articleCount.toLocaleString("fa-IR")}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
