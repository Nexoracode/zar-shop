import Image from "next/image";
import Link from "next/link";
import { Clock, ImageOff, UserRound } from "lucide-react";
import { estimateReadingMinutes, formatReadingTime } from "@/lib/reading-time";
import { articlePath } from "@/modules/articles/paths";
import type { FeaturedArticle } from "@/modules/articles/service";

/** Magazine-style showcase above the blog grid: one hero card plus up to 3 numbered picks. */
export function ArticleFeaturedSection({ articles }: { articles: FeaturedArticle[] }) {
  if (articles.length === 0) return null;
  const [hero, ...rest] = articles;
  const list = rest.slice(0, 3);

  return (
    <section className="mb-14">
      <div className="mb-3.5 text-[11px] font-bold tracking-[0.06em] text-[var(--muted)]">مقالات ویژه</div>
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1.5fr_1fr]">
        <FeaturedHeroCard article={hero} />
        {list.length > 0 && (
          <div className="flex flex-col">
            {list.map((article, index) => (
              <FeaturedListItem key={article.id} article={article} index={index} isLast={index === list.length - 1} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FeaturedHeroCard({ article }: { article: FeaturedArticle }) {
  const readTime = formatReadingTime(estimateReadingMinutes(article.content));
  return (
    <Link
      href={articlePath(article.slug)}
      className="group relative block min-h-[280px] overflow-hidden rounded-[14px] sm:min-h-[420px]"
    >
      {article.coverMedia ? (
        <Image
          src={article.coverMedia.url}
          alt={article.coverMedia.alt ?? article.title}
          fill
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          priority
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[var(--surface-tertiary)] text-[var(--muted)]">
          <ImageOff size={32} />
        </div>
      )}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(23,35,59,.92) 0%, rgba(23,35,59,.55) 42%, rgba(23,35,59,0) 68%)" }}
      />
      <div className="absolute inset-0 flex flex-col justify-end p-[26px]">
        {article.category && (
          <span
            className="mb-3 w-fit rounded-full px-3 py-1 text-[11.5px] font-bold text-white backdrop-blur-[2px]"
            style={{ background: "color-mix(in srgb, var(--brand-accent) 55%, transparent)" }}
          >
            {article.category.name}
          </span>
        )}
        <h2 className="mb-2.5 text-[26px] font-bold leading-[1.4] text-white">{article.title}</h2>
        <p className="mb-3.5 line-clamp-2 max-w-[520px] text-[13.5px] text-white/[0.82]">{article.excerpt}</p>
        <div className="flex items-center gap-4 text-xs text-white/[0.82]">
          <span className="flex items-center gap-1.5"><UserRound size={14} />{article.author.name}</span>
          <span className="flex items-center gap-1.5"><Clock size={14} />{readTime}</span>
        </div>
      </div>
    </Link>
  );
}

function FeaturedListItem({ article, index, isLast }: { article: FeaturedArticle; index: number; isLast: boolean }) {
  const readTime = formatReadingTime(estimateReadingMinutes(article.content));
  const paddingClass = index === 0 ? "pb-[18px] pt-0" : isLast ? "pb-0 pt-[18px]" : "py-[18px]";
  return (
    <Link
      href={articlePath(article.slug)}
      className={`flex items-start gap-3.5 ${paddingClass} ${index > 0 ? "border-t border-[var(--border)]" : ""}`}
    >
      <span
        className="shrink-0 font-[Georgia,serif] text-[32px] font-bold leading-none"
        style={{ color: "color-mix(in srgb, var(--brand-accent) 55%, var(--border))" }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        {article.category && (
          <span
            className="mb-2 inline-block rounded-full px-2.5 py-[3px] text-[10.5px] font-bold"
            style={{ color: "color-mix(in srgb, var(--brand-accent) 65%, black)", background: "color-mix(in srgb, var(--brand-accent) 14%, var(--surface))" }}
          >
            {article.category.name}
          </span>
        )}
        <div className="line-clamp-2 text-[15px] font-bold">{article.title}</div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--muted)]"><Clock size={12} />{readTime}</div>
      </div>
    </Link>
  );
}
