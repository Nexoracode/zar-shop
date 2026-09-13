import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ImageOff } from "lucide-react";
import { formatDate } from "@/lib/format";
import { articlePath } from "@/modules/articles/paths";
import type { ArticleListItem } from "@/modules/articles/service";

// Mirrors ProductCard's "gallery" variant (image + title + one meta line, no card
// border/shadow at rest) so an article tile reads as the same family as a product tile
// wherever the two sit side by side (homepage rows, listing grids).
export function ArticleCard({ article }: { article: ArticleListItem }) {
  const date = article.publishedAt ?? article.createdAt;
  return (
    <Link
      href={articlePath(article.slug)}
      className="group block h-full min-w-0 bg-white transition-all duration-[250ms] ease-out hover:-translate-y-[3px] hover:shadow-[0_14px_32px_color-mix(in_srgb,var(--brand-primary)_10%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-[7px] bg-[var(--surface-tertiary)]">
        {article.coverMedia ? (
          <Image
            src={article.coverMedia.url}
            alt={article.coverMedia.alt ?? article.title}
            width={640}
            height={360}
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw"
            className="h-full w-full object-cover transition-transform duration-400 ease-out group-hover:scale-[1.025]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[var(--muted)]"><ImageOff size={26} /></div>
        )}
        {article.category && (
          <span className="absolute right-2.5 top-2.5 max-w-[70%] truncate rounded-[4px] border border-[var(--brand-accent)]/30 bg-white/90 px-2 py-1 text-[0.62rem] text-[var(--brand-accent)]">
            {article.category.name}
          </span>
        )}
      </div>

      <div className="px-1 pb-4 pt-2.5 text-right sm:pb-5">
        <h3 className="m-0 line-clamp-2 h-10 overflow-hidden text-[0.78rem] font-medium leading-5 text-slate-800 sm:text-[0.85rem]">{article.title}</h3>
        <span className="mt-1.5 flex items-center gap-1.5 text-[0.7rem] text-[var(--muted)]"><CalendarDays size={13} />{formatDate(date)}</span>
      </div>
    </Link>
  );
}
