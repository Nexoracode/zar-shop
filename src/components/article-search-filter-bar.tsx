"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@heroui/react";
import { Search } from "lucide-react";

type Category = { name: string; slug: string };

export function ArticleSearchFilterBar({ categories, activeCategorySlug, initialSearch }: { categories: Category[]; activeCategorySlug?: string; initialSearch: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = search.trim();
      const next = new URLSearchParams(searchParams.toString());
      if (trimmed) next.set("search", trimmed); else next.delete("search");
      next.delete("page");
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 350);
    return () => window.clearTimeout(timer);
    // Only `search` should re-trigger this debounce; `pathname`/`searchParams`/`router` are read
    // fresh each time it fires, not values to react to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const categoryHref = (slug?: string) => {
    const next = new URLSearchParams();
    if (slug) next.set("category", slug);
    const currentSearch = searchParams.get("search");
    if (currentSearch) next.set("search", currentSearch);
    const query = next.toString();
    return query ? `/blog?${query}` : "/blog";
  };

  return (
    <div className="mb-6">
      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="جستجو در عنوان و متن مقاله…"
          aria-label="جستجوی مقاله"
          fullWidth
          variant="secondary"
          className="field-control"
          style={{ paddingRight: "2.25rem" }}
        />
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="فیلتر دسته‌بندی مقالات">
        <Link
          href={categoryHref()}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${!activeCategorySlug ? "bg-[var(--brand-accent)] text-white" : "border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--brand-accent)]"}`}
        >
          همه
        </Link>
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={categoryHref(category.slug)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${category.slug === activeCategorySlug ? "bg-[var(--brand-accent)] text-white" : "border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--brand-accent)]"}`}
          >
            {category.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
