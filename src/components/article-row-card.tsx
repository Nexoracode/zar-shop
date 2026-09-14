import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock, ImageOff, UserRound } from "lucide-react";
import { formatDate } from "@/lib/format";
import { estimateReadingMinutes, formatReadingTime } from "@/lib/reading-time";
import { articlePath } from "@/modules/articles/paths";
import type { ArticleRowItem } from "@/modules/articles/service";

/** Horizontal row tile for the "همه مقالات" list — distinct from the grid-tile `ArticleCard`. */
export function ArticleRowCard({ article }: { article: ArticleRowItem }) {
  const date = article.publishedAt ?? article.createdAt;
  const readTime = formatReadingTime(estimateReadingMinutes(article.content));
  return (
    <Link
      href={articlePath(article.slug)}
      className="group flex overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--brand-accent)]"
    >
      <div className="relative min-h-[140px] w-[140px] shrink-0 self-stretch overflow-hidden bg-[var(--surface-tertiary)] sm:w-[180px]">
        {article.coverMedia ? (
          <Image
            src={article.coverMedia.url}
            alt={article.coverMedia.alt ?? article.title}
            fill
            sizes="(min-width: 640px) 180px, 140px"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[var(--muted)]"><ImageOff size={22} /></div>
        )}
      </div>
      <div className="min-w-0 flex-1 p-4">
        {article.category && (
          <span
            className="mb-2 inline-block rounded-full px-2.5 py-[3px] text-[11px] font-bold"
            style={{ color: "color-mix(in srgb, var(--brand-accent) 65%, black)", background: "color-mix(in srgb, var(--brand-accent) 14%, var(--surface))" }}
          >
            {article.category.name}
          </span>
        )}
        <h3 className="m-0 mb-1.5 text-[16px] font-bold text-[var(--foreground)]">{article.title}</h3>
        <p className="m-0 mb-2 line-clamp-2 text-[13px] leading-6 text-[var(--muted)]">{article.excerpt}</p>
        <div className="flex flex-wrap items-center gap-3.5 text-[11.5px] text-[var(--muted)]">
          <span className="flex items-center gap-1.5"><UserRound size={13} />{article.author.name}</span>
          <span className="flex items-center gap-1.5"><CalendarDays size={13} />{formatDate(date)}</span>
          <span className="flex items-center gap-1.5"><Clock size={13} />{readTime}</span>
        </div>
      </div>
    </Link>
  );
}
