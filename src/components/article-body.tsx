"use client";

import Link from "next/link";
import { useArticleFontSize } from "@/components/article-font-size-context";

export function ArticleBody({ html, tags }: { html: string; tags: string[] }) {
  const { fontSizePx } = useArticleFontSize();
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-7">
      <div
        className="rich-text-content text-[var(--foreground)]"
        style={{ fontSize: `${fontSizePx}px` }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-5 mt-5">
          <strong className="text-[13px] font-bold text-[var(--foreground)]">برچسب‌ها:</strong>
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/blog?search=${encodeURIComponent(tag)}`}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--brand-accent)] hover:bg-[var(--brand-accent)] hover:text-[var(--brand-accent-foreground)]"
            >
              {tag}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
