import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, UserRound } from "lucide-react";
import { ArticleCard } from "@/components/article-card";
import { formatDate } from "@/lib/format";
import { articleUrl, getPublishedArticleBySlug } from "@/modules/articles/service";
import { sanitizeProductDescription } from "@/modules/products/rich-text";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublishedArticleBySlug(slug);
  if (!result) return {};
  const { article } = result;
  const description = article.metaDescription || article.excerpt;
  return {
    title: article.metaTitle || article.title,
    description,
    alternates: { canonical: articleUrl(article.slug) },
    // Per-article noindex; site-wide 301/410/canonical for this URL still come from `proxy.ts`.
    robots: article.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: article.metaTitle || article.title,
      description,
      type: "article",
      url: articleUrl(article.slug),
      images: article.coverMedia ? [{ url: article.coverMedia.url, alt: article.coverMedia.alt ?? article.title }] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: Context) {
  const { slug } = await params;
  const [result, settings] = await Promise.all([getPublishedArticleBySlug(slug), getGeneralStoreSettings()]);
  if (!result) notFound();
  const { article, related } = result;
  const publishedAt = (article.publishedAt ?? article.createdAt).toISOString();
  const baseUrl = env.APP_URL.replace(/\/$/, "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    ...(article.coverMedia ? { image: [article.coverMedia.url] } : {}),
    datePublished: publishedAt,
    dateModified: article.updatedAt.toISOString(),
    author: { "@type": "Person", name: article.authorName },
    publisher: { "@type": "Organization", name: settings.storeName },
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl(article.slug) },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: baseUrl || "/" },
      { "@type": "ListItem", position: 2, name: "وبلاگ", item: `${baseUrl}/blog` },
      { "@type": "ListItem", position: 3, name: article.title, item: articleUrl(article.slug) },
    ],
  };

  return (
    <main className="px-4 py-10 sm:px-6 sm:py-16">
      {!article.noindex && (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
        </>
      )}

      <article className="mx-auto max-w-3xl">
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]" aria-label="مسیر مقاله">
          <Link href="/" className="hover:text-[var(--foreground)]">خانه</Link><span>/</span>
          <Link href="/blog" className="hover:text-[var(--foreground)]">وبلاگ</Link>
          {article.category?.isActive && <><span>/</span><Link href={`/blog/category/${article.category.slug}`} className="hover:text-[var(--foreground)]">{article.category.name}</Link></>}
        </nav>

        <h1 className="m-0 text-2xl font-bold leading-relaxed text-[var(--brand-primary)] sm:text-3xl">{article.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1.5"><UserRound size={14} />{article.authorName}</span>
          <span className="flex items-center gap-1.5"><CalendarDays size={14} />{formatDate(publishedAt)}</span>
        </div>

        {article.coverMedia && (
          <span className="relative mt-6 block aspect-[16/9] w-full overflow-hidden rounded-2xl bg-[var(--surface-secondary)]">
            <Image src={article.coverMedia.url} alt={article.coverMedia.alt ?? article.title} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" priority />
          </span>
        )}

        <div
          className="rich-text-content mt-8 text-[var(--foreground)]"
          dangerouslySetInnerHTML={{ __html: sanitizeProductDescription(article.content) }}
        />
      </article>

      {related.length > 0 && (
        <section className="mx-auto mt-16 max-w-5xl">
          <h2 className="m-0 mb-5 text-lg font-bold text-[var(--brand-primary)]">مقالات مرتبط</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => <ArticleCard key={item.id} article={item} />)}
          </div>
        </section>
      )}

      <div className="mx-auto mt-12 max-w-3xl text-center">
        <Link href="/blog" className="text-sm font-bold text-[var(--brand-accent)]">بازگشت به وبلاگ</Link>
      </div>
    </main>
  );
}
