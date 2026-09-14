import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock, ImageOff, UserRound } from "lucide-react";
import { formatDate } from "@/lib/format";
import { estimateReadingMinutes, formatReadingTime } from "@/lib/reading-time";
import { articlePath } from "@/modules/articles/paths";
import type { ArticleRowItem } from "@/modules/articles/service";

// Grid tile for the "همه مقالات" list — mirrors the storefront product catalog's "catalog" tile
// (`ProductCard`'s `storefrontVariant="catalog"`): seamless border-b/border-l grid lines, hover
// shadow, focus ring on `--brand-primary`. Tiled by `ArticleListSection`'s bordered grid.
export function ArticleRowCard({ article }: { article: ArticleRowItem }) {
  const date = article.publishedAt ?? article.createdAt;
  const readTime = formatReadingTime(estimateReadingMinutes(article.content));
  return (
    <Link
      href={articlePath(article.slug)}
      className="group relative flex min-w-0 flex-col border-b border-l border-[var(--border)] bg-[var(--surface)] p-4 transition duration-200 hover:z-10 hover:shadow-[0_6px_24px_rgba(0,0,0,.09)] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)]"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-[var(--surface-tertiary)]">
        {article.coverMedia ? (
          <Image
            src={article.coverMedia.url}
            alt={article.coverMedia.alt ?? article.title}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[var(--muted)]"><ImageOff size={26} /></div>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col pt-3 text-right">
        {article.category && (
          <span
            className="mb-2 inline-block w-fit rounded-full px-2.5 py-[3px] text-[10.5px] font-bold"
            style={{ color: "color-mix(in srgb, var(--brand-accent) 65%, black)", background: "color-mix(in srgb, var(--brand-accent) 14%, var(--surface))" }}
          >
            {article.category.name}
          </span>
        )}
        <h3 className="m-0 line-clamp-2 min-h-[2.6rem] text-[13px] font-bold leading-6 text-[var(--foreground)]">{article.title}</h3>
        <p className="m-0 mt-1.5 line-clamp-1 text-[12px] leading-5 text-[var(--muted)]">{article.excerpt}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[11px] text-[var(--muted)]">
          <span className="flex items-center gap-1"><UserRound size={12} />{article.author.name}</span>
          <span className="flex items-center gap-1"><CalendarDays size={12} />{formatDate(date)}</span>
          <span className="flex items-center gap-1"><Clock size={12} />{readTime}</span>
        </div>
      </div>
    </Link>
  );
}
