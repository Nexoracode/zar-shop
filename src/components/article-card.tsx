import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ImageOff, Star } from "lucide-react";
import { formatDate } from "@/lib/format";
import { articlePath } from "@/modules/articles/paths";
import type { ArticleListItem } from "@/modules/articles/service";

// Mirrors ProductCard's `gallery` variant (the card behind "محبوب‌ترین‌ها" / "جدیدترین
// محصولات") — same badge position/style, same title box, no container-level hover (only the
// image itself zooms) — so an article tile reads as the same card family as a product tile.
export function ArticleCard({ article }: { article: ArticleListItem }) {
  const date = article.publishedAt ?? article.createdAt;
  const rating = Number(article.ratingAverage);
  return (
    <Link
      href={articlePath(article.slug)}
      className="group block h-full min-w-0 bg-white transition-all duration-[250ms] ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[7px] bg-[var(--surface-tertiary)]">
        {article.coverMedia ? (
          <Image
            src={article.coverMedia.url}
            alt={article.coverMedia.alt ?? article.title}
            width={480}
            height={360}
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw"
            className="h-full w-full object-cover transition-transform duration-400 ease-out group-hover:scale-[1.025]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[var(--muted)]"><ImageOff size={24} /></div>
        )}
        {article.category && (
          <span className="absolute left-2.5 top-2.5 max-w-[70%] truncate rounded-[4px] bg-white/90 px-2 py-1 text-[0.62rem] text-slate-600 shadow-sm">
            {article.category.name}
          </span>
        )}
      </div>

      <div className="px-1 pb-4 pt-2 text-right sm:pb-5">
        <h3 className="m-0 mb-1 line-clamp-2 h-10 overflow-hidden text-[0.76rem] font-medium leading-5 text-slate-800 sm:text-[0.82rem]">{article.title}</h3>
        <div className="flex items-center justify-between gap-2 text-[0.7rem] text-[var(--muted)]">
          <span className="truncate">{article.authorName}</span>
          {article.ratingCount > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-slate-600">
              <Star size={12} className="fill-[var(--warning)] text-[var(--warning)]" />
              {rating.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}
            </span>
          )}
        </div>
        <span className="mt-1 flex items-center gap-1.5 text-[0.68rem] text-[var(--muted)]"><CalendarDays size={12} />{formatDate(date)}</span>
      </div>
    </Link>
  );
}
