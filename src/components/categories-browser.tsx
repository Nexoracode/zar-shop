"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronLeft, Package } from "lucide-react";
import type { CategoryTreeNode } from "@/modules/products/category-tree";

// Digikala's own /categories/ page (measured from the live site, mobile view): a narrow rail of
// top-level categories on one side (icon over label, active tile pilled in the brand color) and
// a wide accordion pane on the other showing the selected category's children, each expandable
// to its own grandchildren. Rebuilt here against this store's real category tree instead of
// Digikala's multi-vertical marketplace switcher, which has no equivalent in a single-store app.
export function CategoriesBrowser({ categories }: { categories: CategoryTreeNode[] }) {
  const [activeId, setActiveId] = useState(categories[0]?.id ?? "");
  const [expandedChildId, setExpandedChildId] = useState<string | null>(null);
  const active = categories.find((category) => category.id === activeId) ?? categories[0];

  if (!active) {
    return <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">دسته‌بندی فعالی برای نمایش ثبت نشده است.</p>;
  }

  return (
    <div className="flex items-start" dir="rtl">
      <aside className="flex w-20 shrink-0 flex-col gap-1 py-2 sm:w-24" aria-label="دسته‌های اصلی">
        {categories.map((category) => {
          const isActive = category.id === active.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => { setActiveId(category.id); setExpandedChildId(null); }}
              aria-current={isActive ? "true" : undefined}
              className={`flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-center transition ${isActive ? "bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "text-[var(--foreground)]"}`}
            >
              <span className={`relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg ${isActive ? "bg-white/15" : "bg-[var(--surface-secondary)]"}`}>
                {category.image?.type === "IMAGE" ? <Image src={category.image.url} alt={category.image.alt ?? category.name} fill sizes="36px" className="object-cover" /> : <Package size={17} />}
              </span>
              <span className="line-clamp-2 text-[11px] font-bold leading-4">{category.name}</span>
            </button>
          );
        })}
      </aside>

      <section key={active.id} className="min-w-0 flex-1 border-r border-[var(--border)] py-2 pr-3" aria-label={`زیردسته‌های ${active.name}`}>
        <Link href={`/products?category=${active.slug}`} className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-[var(--brand-primary)]">
          همه محصولات {active.name}<ChevronLeft size={15} />
        </Link>

        {active.children.length === 0 ? (
          <p className="py-6 text-xs text-[var(--muted)]">زیردسته‌ای برای این دسته ثبت نشده است.</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-[var(--border)] border-t border-[var(--border)] p-0">
            {active.children.map((child) => {
              const hasGrandchildren = child.children.length > 0;
              const expanded = expandedChildId === child.id;
              return (
                <li key={child.id}>
                  {hasGrandchildren ? (
                    <button type="button" onClick={() => setExpandedChildId(expanded ? null : child.id)} aria-expanded={expanded} className="flex min-h-12 w-full items-center justify-between gap-2 py-3 text-right text-sm">
                      <span>{child.name}</span>
                      <ChevronDown size={17} className={`shrink-0 text-[var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                  ) : (
                    <Link href={`/products?category=${child.slug}`} className="flex min-h-12 items-center py-3 text-sm">{child.name}</Link>
                  )}
                  {hasGrandchildren && expanded && (
                    <ul className="m-0 grid list-none gap-3 p-0 pb-3 pr-2 text-xs text-[var(--muted)]">
                      {child.children.map((grandchild) => (
                        <li key={grandchild.id}><Link href={`/products?category=${grandchild.slug}`} className="block transition hover:text-[var(--brand-primary)]">{grandchild.name}</Link></li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
