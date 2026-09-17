import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, Clock, Eye, UserRound } from "lucide-react";
import { ArticleAnchorOffset } from "@/components/article-anchor-offset";
import { ArticleAuthorBioCard } from "@/components/article-author-bio-card";
import { ArticleBody } from "@/components/article-body";
import { ArticleCard } from "@/components/article-card";
import { ArticleComments } from "@/components/article-comments";
import { ArticleFaqAccordion } from "@/components/article-faq-accordion";
import { ArticleFontSizeControl } from "@/components/article-font-size-control";
import { ArticleFontSizeProvider } from "@/components/article-font-size-context";
import { ArticleRatingWidget } from "@/components/article-rating-widget";
import { ArticleReadingProgressBar } from "@/components/article-reading-progress-bar";
import { ArticleRelatedProductCard } from "@/components/article-related-product-card";
import { ArticleShareBox } from "@/components/article-share-box";
import { ArticleTocBox } from "@/components/article-toc-box";
import { ArticleViewTracker } from "@/components/article-view-tracker";
import type { StorefrontArticleComment } from "@/modules/article-comments/service";
import { getStorefrontArticleComments } from "@/modules/article-comments/service";
import { formatDate, formatMoney } from "@/lib/format";
import { estimateReadingMinutes, formatReadingTime } from "@/lib/reading-time";
import { extractTableOfContents } from "@/lib/article-toc";
import { getCurrentUser } from "@/modules/auth/session";
import { articleUrl, getPublishedArticleBySlug } from "@/modules/articles/service";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { calculateProductPrice } from "@/modules/products/pricing";
import { sanitizeProductDescription } from "@/modules/products/rich-text";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { env } from "@/lib/env";
import { connection } from "next/server";

type Context = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  // getPublishedArticleBySlug is an uncached raw DB read (see its own comment); mark this
  // metadata generation as request-time explicitly so Next doesn't attempt to prerender
  // through it.
  await connection();
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

function countComments(items: StorefrontArticleComment[]): number {
  return items.reduce((total, item) => total + 1 + countComments(item.replies), 0);
}

export default async function ArticlePage({ params }: Context) {
  const { slug } = await params;
  const currentUser = await getCurrentUser();
  const [result, settings] = await Promise.all([getPublishedArticleBySlug(slug, currentUser?.id ?? null), getGeneralStoreSettings()]);
  if (!result) notFound();
  const { article, related, viewerRating } = result;
  const isAuthenticated = Boolean(currentUser && !currentUser.isGuest);
  const publishedAt = (article.publishedAt ?? article.createdAt).toISOString();
  const baseUrl = env.APP_URL.replace(/\/$/, "");

  const sanitizedContent = sanitizeProductDescription(article.content);
  const { html: contentHtml, sections } = extractTableOfContents(sanitizedContent);
  const tags = Array.isArray(article.tags) ? (article.tags as string[]) : [];
  const readTime = formatReadingTime(estimateReadingMinutes(article.content));
  const faqs = article.faqs.map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer }));

  const comments = await getStorefrontArticleComments(article.id, currentUser?.id ?? null);
  const commentCount = countComments(comments);

  let relatedProductView: { name: string; href: string; price: string; image?: { src: string; alt: string } } | null = null;
  if (article.relatedProduct) {
    const rp = article.relatedProduct;
    const gold = rp.storeIndustry === "GOLD" ? await getGoldPriceForDisplay() : null;
    const rate = gold?.pricePerGram18 ?? null;
    const parts = rp.storeIndustry === "GOLD" && rate !== null
      ? calculateProductPrice({ goldPricePerGram18: rate, weightGrams: rp.weightGrams, purity: rp.purity, makingFeeType: rp.makingFeeType, makingFeeValue: rp.makingFeeValue, profitPercent: rp.profitPercent, taxPercent: rp.taxPercent })
      : null;
    const baseTotal = rp.fixedPrice ? Number(rp.fixedPrice) : parts?.total ?? null;
    const discounted = baseTotal === null ? null : calculateDiscountedPrice(baseTotal, rp);
    const total = discounted?.finalPrice ?? null;
    const media = rp.media[0]?.media;
    relatedProductView = {
      name: rp.name,
      href: `/products/${rp.slug}`,
      price: total !== null ? formatMoney(total, settings.currency) : "قیمت موقتاً در دسترس نیست",
      image: media?.type === "IMAGE" ? { src: media.url, alt: media.alt ?? rp.name } : undefined,
    };
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    ...(article.coverMedia ? { image: [article.coverMedia.url] } : {}),
    datePublished: publishedAt,
    dateModified: article.updatedAt.toISOString(),
    author: { "@type": "Person", name: article.author.name },
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
    <>
      <ArticleAnchorOffset />
      <ArticleReadingProgressBar contentId="article-main-column" />
      <main className="px-4 py-8 sm:px-6 sm:py-10">
        {!article.noindex && (
          <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
          </>
        )}

        <div className="mx-auto w-[min(1180px,100%)]">
          <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)]" aria-label="مسیر مقاله">
            <Link href="/" className="hover:text-[var(--foreground)]">خانه</Link>
            <ChevronLeft size={10} />
            <Link href="/blog" className="hover:text-[var(--foreground)]">وبلاگ</Link>
            {article.category?.isActive && <>
              <ChevronLeft size={10} />
              <Link href={`/blog/category/${article.category.slug}`} className="hover:text-[var(--foreground)]">{article.category.name}</Link>
            </>}
            <ChevronLeft size={10} />
            <span className="line-clamp-1 max-w-[320px] text-[var(--foreground)]">{article.title}</span>
          </nav>

          <ArticleFontSizeProvider>
            {article.category?.isActive && (
              <span
                className="mb-3 inline-block rounded-full px-3.5 py-[5px] text-[11.5px] font-bold"
                style={{ color: "color-mix(in srgb, var(--brand-accent) 65%, black)", background: "color-mix(in srgb, var(--brand-accent) 14%, var(--surface))" }}
              >
                {article.category.name}
              </span>
            )}
            <h1 className="m-0 mb-4 text-[22px] font-bold leading-relaxed text-[var(--foreground)] sm:text-[28px]">{article.title}</h1>

            <div className="mb-5 flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1.5">
                <span className="relative grid size-[26px] shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--surface-tertiary)]">
                  {article.author.avatar ? <Image src={article.author.avatar.url} alt={article.author.avatar.alt ?? article.author.name} fill sizes="26px" className="object-cover" /> : <UserRound size={13} />}
                </span>
                {article.author.name}
              </span>
              <span className="flex items-center gap-1.5"><CalendarDays size={14} />{formatDate(publishedAt)}</span>
              <span className="flex items-center gap-1.5"><Clock size={14} />{readTime}</span>
              <span className="flex items-center gap-1.5"><Eye size={14} />{article.viewCount.toLocaleString("fa-IR")} بازدید</span>
              <ArticleFontSizeControl />
            </div>

            {article.coverMedia && (
              <div className="relative mb-8 h-[260px] w-full overflow-hidden rounded-xl bg-[var(--surface-secondary)] sm:h-[380px]">
                <Image src={article.coverMedia.url} alt={article.coverMedia.alt ?? article.title} fill sizes="(max-width: 768px) 100vw, 1180px" className="object-cover" priority />
              </div>
            )}

            <div className="grid items-start gap-8 lg:grid-cols-[1fr_280px]">
              <div id="article-main-column" className="min-w-0">
                <ArticleTocBox sections={sections} />
                <ArticleBody html={contentHtml} tags={tags} />
                <ArticleFaqAccordion faqs={faqs} />
              </div>

              <aside className="grid gap-4 lg:sticky lg:top-[84px]">
                <ArticleAuthorBioCard author={article.author} />
                {relatedProductView && <ArticleRelatedProductCard product={relatedProductView} />}
                <ArticleShareBox title={article.title} url={articleUrl(article.slug)} />
              </aside>
            </div>
          </ArticleFontSizeProvider>

          <section className="mt-11 border-t border-[var(--border)] pt-8">
            <h2 className="m-0 mb-4 text-[17px] font-bold text-[var(--foreground)]">دیدگاه‌ها و امتیازها <span className="text-[13.5px] font-medium text-[var(--muted)]">({commentCount.toLocaleString("fa-IR")})</span></h2>
            <div className="mb-6">
              <ArticleRatingWidget
                key={`${article.ratingAverage}-${article.ratingCount}`}
                articleId={article.id}
                initialAverage={Number(article.ratingAverage)}
                initialCount={article.ratingCount}
                initialOwnRating={viewerRating}
                canRate={isAuthenticated}
                interactive={false}
              />
            </div>
            <ArticleComments articleId={article.id} initialComments={comments} isAuthenticated={isAuthenticated} />
          </section>

          {related.length > 0 && (
            <section className="mt-11">
              <div className="mb-4 text-[11px] font-bold tracking-[0.06em] text-[var(--muted)]">مقالات مرتبط</div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => <ArticleCard key={item.id} article={item} />)}
              </div>
            </section>
          )}
        </div>
      </main>
      <ArticleViewTracker articleId={article.id} />
    </>
  );
}
