import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ImageOff } from "lucide-react";
import { formatDate } from "@/lib/format";
import { articlePath } from "@/modules/articles/paths";
import type { ArticleListItem } from "@/modules/articles/service";

export function ArticleCard({ article }: { article: ArticleListItem }) {
  const date = article.publishedAt ?? article.createdAt;
  return (
    <Link
      href={articlePath(article.slug)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--brand-accent)] hover:shadow-sm"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--surface-secondary)] text-[var(--muted)]">
        {article.coverMedia ? (
          <Image
            src={article.coverMedia.url}
            alt={article.coverMedia.alt ?? article.title}
            width={640}
            height={360}
            sizes="(max-width: 768px) 100vw, 360px"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center"><ImageOff size={28} /></div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {article.category && <span className="text-[11px] font-bold text-[var(--brand-accent)]">{article.category.name}</span>}
        <strong className="line-clamp-2 text-sm font-bold text-[var(--foreground)]">{article.title}</strong>
        <span className="line-clamp-2 text-xs leading-6 text-[var(--muted)]">{article.excerpt}</span>
        <span className="mt-auto flex items-center gap-1.5 pt-2 text-[11px] text-[var(--muted)]">
          <CalendarDays size={13} />{formatDate(date)}
        </span>
      </div>
    </Link>
  );
}
