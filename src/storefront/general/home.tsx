import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, Dumbbell, HeartPulse, House, Laptop, Shirt, ShoppingBag, Smartphone, Sparkles } from "lucide-react";
import { DiscountExpiryRefresh } from "@/components/discount-expiry-refresh";
import { DragScrollRow } from "@/components/drag-scroll-row";
import { FlashSaleCountdown } from "@/components/flash-sale-countdown";
import { HomepageBrands } from "@/components/homepage-brands";
import { HomepageLatestArticles } from "@/components/homepage-latest-articles";
import { HomepageProductFeed } from "@/components/homepage-product-feed";
import { HomepageBestSellers } from "@/components/homepage-best-sellers";
import { ProductCard } from "@/components/product-card";
import { StorefrontHeroSlider } from "@/components/storefront-hero-slider";
import { StorefrontImageTiles } from "@/components/storefront-image-tiles";
import { ViewAllProductCard } from "@/components/view-all-product-card";
import { db } from "@/lib/db";
import { getLatestPublishedArticles } from "@/modules/articles/service";
import { earliestDiscountEnd } from "@/modules/products/discount-window";
import { getStorefrontFlashDeals, getStorefrontProductFeed } from "@/modules/products/storefront-feed";
import type { StorefrontProductCardItem } from "@/modules/products/storefront-feed-contract";
import { getHomepageSettings, type HomepageLayoutItemId } from "@/modules/settings/homepage-settings";
import { buildStorefrontHeroSlides } from "@/storefront/shared/hero";

const container = "mx-auto w-[min(var(--store-max-width),calc(100%-24px))] sm:w-[min(var(--store-max-width),calc(100%-40px))] lg:w-[min(var(--store-max-width),calc(100%-64px))]";
const categoryTones = ["bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]", "bg-blue-50 text-blue-600", "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]", "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]", "bg-violet-50 text-violet-600", "bg-cyan-50 text-cyan-600"];

function resolveCategoryIcon(value: string): LucideIcon {
  const name = value.toLowerCase();
  if (name.includes("موبایل")) return Smartphone;
  if (name.includes("دیجیتال")) return Laptop;
  if (name.includes("خانه") || name.includes("آشپزخانه")) return House;
  if (name.includes("پوشاک") || name.includes("مد")) return Shirt;
  if (name.includes("ورزش") || name.includes("سفر")) return Dumbbell;
  if (name.includes("زیبایی") || name.includes("سلامت")) return HeartPulse;
  return ShoppingBag;
}

function ProductRail({ title, description, products, href }: { title: string; description: string; products: StorefrontProductCardItem[]; href: string }) {
  if (!products.length) return null;
  return <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e6e8ec] bg-white px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
    <div className="mb-5 flex items-end justify-between gap-4"><div><h2 className="m-0 text-xl font-bold text-[#232934] sm:text-2xl">{title}</h2><p className="mb-0 mt-1 text-xs text-[#858b95] sm:text-sm">{description}</p></div><Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#232934] transition hover:text-black">مشاهده همه<ChevronLeft size={15} /></Link></div>
    <DragScrollRow ariaLabel={title} showNavigation className="flex w-full min-w-0 max-w-full gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {products.map((product, index) => <div key={product.id} className="w-[164px] min-w-[164px] snap-start sm:w-[206px] sm:min-w-[206px] lg:w-[218px] lg:min-w-[218px]"><ProductCard {...product} storefrontVariant="gallery" imageTone={index % 4} /></div>)}
    </DragScrollRow>
  </section>;
}

export async function GeneralHome() {
  const [homepage, latestFeed, popularFeed, flashDeals, categories, brands, latestArticles] = await Promise.all([
    getHomepageSettings(),
    getStorefrontProductFeed({ sort: "LATEST", page: 1 }),
    getStorefrontProductFeed({ sort: "POPULAR", page: 1, pageSize: 12 }),
    getStorefrontFlashDeals(),
    db.category.findMany({
      where: { parentId: null, isActive: true, products: { some: { status: "ACTIVE", storeIndustry: "GENERAL" } } },
      include: { image: true, _count: { select: { products: { where: { status: "ACTIVE", storeIndustry: "GENERAL" } } } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 10,
    }),
    db.brand.findMany({
      where: { isActive: true, featured: true },
      include: { logo: { select: { url: true, alt: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 20,
    }),
    getLatestPublishedArticles(4),
  ]);

  const heroSlides = buildStorefrontHeroSlides(homepage, "/images/zar-hero-campaign.png");
  const sectionState = new Map(homepage.sections.map((section) => [section.id, section.enabled]));
  const sectionOrder = new Map(homepage.sections.map((section, index) => [section.id, index]));
  const sectionProps = (id: HomepageLayoutItemId) => ({ hidden: sectionState.get(id) === false, style: { order: sectionOrder.get(id) ?? homepage.sections.length } });
  // `getStorefrontFlashDeals` only returns discounts still running, so the earliest end is ahead of
  // now — no clock needed here (a `Date.now()` while rendering can't be prerendered).
  const flashDealsExpiry = earliestDiscountEnd(flashDeals);

  return <main className="flex flex-col gap-4 overflow-hidden bg-[#f4f5f7] pb-[78px] pt-3 lg:gap-6 lg:pb-8">
    <section {...sectionProps("HERO")} className="bg-white"><StorefrontHeroSlider slides={heroSlides} contentMode={homepage.heroContentMode} title={homepage.heroTitle} description={homepage.heroDescription} buttonLabel={homepage.heroButtonLabel} /></section>

    {homepage.tileGroups.map((group) => group.tiles.some((tile) => tile.media) && <section key={group.id} {...sectionProps(`TILE_GROUP:${group.id}`)} className={container} aria-label="پیشنهادهای تصویری"><StorefrontImageTiles groups={[group]} /></section>)}

    {categories.length > 0 && <section {...sectionProps("CATEGORIES")} className={`${container} rounded-2xl bg-white px-3 py-6 sm:px-6 lg:py-8`} aria-label="دسته‌بندی محصولات">
      <div className="mb-6 flex items-center justify-between"><h2 className="m-0 text-lg font-bold text-[#232934] sm:text-xl">خرید بر اساس دسته‌بندی</h2><Link href="/products" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)]">همه کالاها<ChevronLeft size={15} /></Link></div>
      <DragScrollRow ariaLabel="دسته‌بندی محصولات" showNavigation className="flex w-full min-w-0 max-w-full gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{categories.map((category, index) => {
        const Icon = resolveCategoryIcon(`${category.name} ${category.slug}`);
        return <Link key={category.id} href={`/products?category=${category.slug}`} className="group grid w-[84px] min-w-[84px] shrink-0 snap-start justify-items-center gap-2.5 text-center sm:w-[100px] sm:min-w-[100px] lg:w-[112px] lg:min-w-[112px]"><span className={`relative grid aspect-square w-full place-items-center overflow-hidden rounded-full ${categoryTones[index % categoryTones.length]} transition duration-300 group-hover:-translate-y-1 group-hover:shadow-md`}>{category.image?.type === "IMAGE" ? <Image src={category.image.url} alt={category.image.alt ?? category.name} fill sizes="112px" className="object-cover transition duration-500 group-hover:scale-105" /> : <><span className="absolute -left-4 -top-4 size-14 rounded-full bg-white/50" /><Icon size={38} strokeWidth={1.4} /></>}</span><span className="w-full truncate text-xs font-bold text-[#3d4450]">{category.name}</span><small className="-mt-1 text-[10px] text-[#9298a2]">{category._count.products.toLocaleString("fa-IR")} کالا</small></Link>;
      })}</DragScrollRow>
    </section>}

    {brands.length > 0 && <div {...sectionProps("BRANDS")} className={container}><HomepageBrands brands={brands} /></div>}

    {flashDeals.length > 0 && <section {...sectionProps("FEATURED_PRODUCTS")} className={container} aria-label="پیشنهادهای ویژه">
      <div className="overflow-hidden rounded-2xl" style={{ background: "linear-gradient(225deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 80%, black) 100%)" }}>
        <div className="flex flex-col lg:flex-row lg:items-stretch">
          <div className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-5 lg:flex-col lg:justify-center lg:gap-6 lg:self-stretch lg:px-5 lg:pb-5 lg:pt-3">
            <Sparkles size={24} className="shrink-0 text-[var(--brand-primary-foreground)] lg:size-16" />
            <strong className="shrink-0 text-lg font-extrabold leading-6 text-[var(--brand-primary-foreground)] lg:text-center lg:text-2xl lg:leading-8">شگفت‌انگیز</strong>
            {flashDealsExpiry && <FlashSaleCountdown endsAt={flashDealsExpiry} className="shrink-0" />}
            <Link href="/products" className="mr-auto inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[var(--brand-primary-foreground)] lg:mr-0 lg:mt-1 lg:rounded-lg lg:px-3 lg:py-2 lg:text-sm lg:transition lg:hover:bg-black/5">
              <span className="lg:hidden">همه</span><span className="hidden lg:inline">مشاهده همه</span><ChevronLeft size={15} />
            </Link>
          </div>
          <div className="min-w-0 flex-1 overflow-hidden p-3 sm:p-4 lg:p-5">
            <DragScrollRow ariaLabel="پیشنهادهای شگفت‌انگیز" showNavigation className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {flashDeals.map((product, index) => <div key={product.id} className="w-[calc(50%-2px)] min-w-[calc(50%-2px)] snap-start sm:w-[220px] sm:min-w-[220px] lg:w-[224px] lg:min-w-[224px]"><ProductCard {...product} storefrontVariant="gallery" imageTone={index % 4} /></div>)}
              <div className="w-[calc(50%-2px)] min-w-[calc(50%-2px)] snap-start sm:w-[220px] sm:min-w-[220px] lg:w-[224px] lg:min-w-[224px]"><ViewAllProductCard href="/products" /></div>
            </DragScrollRow>
          </div>
        </div>
      </div>
      <DiscountExpiryRefresh at={flashDealsExpiry} />
    </section>}

    {popularFeed.items.length > 0 && <div {...sectionProps("POPULAR_PRODUCTS")} className={container}><ProductRail title="محبوب‌ترین کالاها" description="محصولاتی که بیشتر مورد توجه مشتریان قرار گرفته‌اند" products={popularFeed.items} href="/products?sortby=popular" /></div>}

    {popularFeed.items.length > 0 && <div {...sectionProps("BEST_SELLING_PRODUCTS")} className={container}><HomepageBestSellers products={popularFeed.items} /></div>}

    <section {...sectionProps("LATEST_PRODUCTS")} className={`${container} min-w-0 overflow-hidden rounded-2xl border border-[#e6e8ec] bg-white px-4 py-6 sm:px-6 lg:px-7 lg:py-8`}><div className="mb-5 flex items-end justify-between gap-4"><div><h2 className="m-0 text-xl font-bold text-[#232934] sm:text-2xl">جدیدترین محصولات</h2><p className="mb-0 mt-1 text-xs text-[#858b95] sm:text-sm">تازه‌ترین کالاهای اضافه‌شده به فروشگاه</p></div><Link href="/products?sortby=newest" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#232934] transition hover:text-black">مشاهده همه<ChevronLeft size={15} /></Link></div><HomepageProductFeed initialFeed={latestFeed} industry="GENERAL" /></section>

    {latestArticles.length > 0 && <div {...sectionProps("ARTICLES")} className={`${container} min-w-0 overflow-hidden rounded-2xl border border-[#e6e8ec] bg-white px-4 py-6 sm:px-6 lg:px-7 lg:py-8`}><HomepageLatestArticles articles={latestArticles} /></div>}

  </main>;
}
