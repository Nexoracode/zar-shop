import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, Dumbbell, HeartPulse, House, Laptop, Shirt, ShoppingBag, Smartphone } from "lucide-react";
import { DragScrollRow } from "@/components/drag-scroll-row";
import { HomepageBrands } from "@/components/homepage-brands";
import { HomepageLatestArticles } from "@/components/homepage-latest-articles";
import { HomepageBestSellers } from "@/components/homepage-best-sellers";
import { ProductListSection } from "@/components/product-list-section";
import { StorefrontHeroSlider } from "@/components/storefront-hero-slider";
import { StorefrontImageTiles } from "@/components/storefront-image-tiles";
import { db } from "@/lib/db";
import { getLatestPublishedArticles } from "@/modules/articles/service";
import { builderSectionProps } from "@/modules/page-builder/sections";
import { BuilderPart } from "@/components/builder-part";
import { isPartHidden } from "@/modules/page-builder/display-parts";
import { BannerSlider } from "@/components/banner-slider";
import { getBannerSetData } from "@/modules/page-builder/banner-slider-data";
import { isTileLayout } from "@/modules/page-builder/banners";
import { getProductListData } from "@/modules/page-builder/product-list-data";
import { getStorefrontProductFeed } from "@/modules/products/storefront-feed";
import { arrangeCategories } from "@/modules/page-builder/section-settings";
import { getPageSectionSettings } from "@/modules/page-builder/section-settings-store";
import { pageSectionLimits } from "@/modules/settings/settings-limits";
import { getPageDisplaySettings } from "@/modules/page-builder/display-settings";
import { isSectionHiddenAtRender } from "@/modules/page-builder/layout-draft";
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

export async function GeneralHome({ editable = false }: { /** The viewer can edit the page (the page builder is mounted): disabled sections and switched-off parts are rendered so it can show them. */ editable?: boolean }) {
  const sectionSettings = await getPageSectionSettings();
  const productLists = Object.entries(sectionSettings.productLists);
  const [homepage, popularFeed, listsData, allCategories, brands, latestArticles, pageDisplay, bannerSets] = await Promise.all([
    getHomepageSettings(),
    getStorefrontProductFeed({ sort: "POPULAR", page: 1, pageSize: 12 }),
    Promise.all(productLists.map(([, config]) => getProductListData(config))),
    db.category.findMany({
      where: { parentId: null, isActive: true, products: { some: { status: "ACTIVE", storeIndustry: "GENERAL" } } },
      include: { image: true, _count: { select: { products: { where: { status: "ACTIVE", storeIndustry: "GENERAL" } } } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: pageSectionLimits.categoriesPool,
    }),
    db.brand.findMany({
      where: { isActive: true, featured: true },
      include: { logo: { select: { url: true, alt: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 20,
    }),
    getLatestPublishedArticles(4),
    getPageDisplaySettings(),
    getBannerSetData(sectionSettings.bannerSliders),
  ]);

  const categories = arrangeCategories(allCategories, sectionSettings.CATEGORIES);
  const categoriesPart = (id: string) => ({ section: "CATEGORIES", id, hidden: isPartHidden(pageDisplay, "CATEGORIES", id), editable });
  const heroSlides = buildStorefrontHeroSlides(homepage, "/images/zar-hero-campaign.png");
  const sectionById = new Map(homepage.sections.map((section) => [section.id, section]));
  const sectionOrder = new Map(homepage.sections.map((section, index) => [section.id, index]));
  // A section still being made in the page builder is a draft: only the people editing the page see it.
  const isShown = (id: string) => editable || !sectionSettings.draftSectionIds.includes(id);
  const sectionProps = (id: HomepageLayoutItemId) => ({ ...builderSectionProps(id), hidden: isSectionHiddenAtRender(sectionById.get(id), editable), style: { order: sectionOrder.get(id) ?? homepage.sections.length } });

  return <main className="flex flex-col gap-4 overflow-hidden bg-[#f4f5f7] pb-[78px] pt-3 lg:gap-6 lg:pb-8">
    <section {...sectionProps("HERO")} className="bg-white"><StorefrontHeroSlider slides={heroSlides} contentMode={homepage.heroContentMode} title={homepage.heroTitle} description={homepage.heroDescription} buttonLabel={homepage.heroButtonLabel} arrowsHidden={isPartHidden(pageDisplay, "HERO", "arrows")} dotsHidden={isPartHidden(pageDisplay, "HERO", "dots")} editable={editable} /></section>

    {homepage.tileGroups.map((group) => (editable || group.tiles.some((tile) => tile.media)) && <section key={group.id} {...sectionProps(`TILE_GROUP:${group.id}`)} className={container} aria-label="پیشنهادهای تصویری"><StorefrontImageTiles groups={[group]} editable={editable} /></section>)}

    {categories.length > 0 && <section {...sectionProps("CATEGORIES")} className={`${container} rounded-2xl bg-white px-3 py-6 sm:px-6 lg:py-8`} aria-label="دسته‌بندی محصولات">
      <div className="mb-6 flex items-center justify-between"><BuilderPart {...categoriesPart("title")}><h2 className="m-0 text-lg font-bold text-[#232934] sm:text-xl">{sectionSettings.CATEGORIES.title}</h2></BuilderPart><BuilderPart {...categoriesPart("more")}><Link href="/products" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)]">همه کالاها<ChevronLeft size={15} /></Link></BuilderPart></div>
      <DragScrollRow ariaLabel="دسته‌بندی محصولات" showNavigation className="flex w-full min-w-0 max-w-full gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{categories.map((category, index) => {
        const Icon = resolveCategoryIcon(`${category.name} ${category.slug}`);
        return <Link key={category.id} href={`/products?category=${category.slug}`} className="group grid w-[84px] min-w-[84px] shrink-0 snap-start justify-items-center gap-2.5 text-center sm:w-[100px] sm:min-w-[100px] lg:w-[112px] lg:min-w-[112px]"><BuilderPart {...categoriesPart("categoryImage")} className="contents"><span className={`relative grid aspect-square w-full place-items-center overflow-hidden rounded-full ${categoryTones[index % categoryTones.length]} transition duration-300 group-hover:-translate-y-1 group-hover:shadow-md`}>{category.image?.type === "IMAGE" ? <Image src={category.image.url} alt={category.image.alt ?? category.name} fill sizes="112px" className="object-cover transition duration-500 group-hover:scale-105" /> : <><span className="absolute -left-4 -top-4 size-14 rounded-full bg-white/50" /><Icon size={38} strokeWidth={1.4} /></>}</span></BuilderPart><BuilderPart {...categoriesPart("categoryTitle")}><span className="w-full truncate text-xs font-bold text-[#3d4450]">{category.name}</span></BuilderPart><BuilderPart {...categoriesPart("categoryCount")}><small className="-mt-1 text-[10px] text-[#9298a2]">{category._count.products.toLocaleString("fa-IR")} کالا</small></BuilderPart></Link>;
      })}</DragScrollRow>
    </section>}

    {brands.length > 0 && <div {...sectionProps("BRANDS")} className={container}><HomepageBrands brands={brands} /></div>}

    {Object.entries(sectionSettings.bannerSliders).map(([id, slider]) => isShown(id) && (isTileLayout(slider.layout)
      ? (editable || bannerSets.tileGroups[id].tiles.some((tile) => tile.media)) && <section key={id} {...sectionProps(id as HomepageLayoutItemId)} className={container} aria-label="پیشنهادهای تصویری"><StorefrontImageTiles groups={[bannerSets.tileGroups[id]]} editable={editable} /></section>
      : (bannerSets.slides[id].length > 0 || editable) && <div key={id} {...sectionProps(id as HomepageLayoutItemId)} className={container}><BannerSlider sectionId={id} layout={slider.layout} slides={bannerSets.slides[id]} arrowsHidden={isPartHidden(pageDisplay, id, "arrows")} dotsHidden={isPartHidden(pageDisplay, id, "dots")} editable={editable} /></div>))}

    {productLists.map(([id, config], index) => isShown(id) && (listsData[index].products.length > 0 || editable) && <div key={id} {...sectionProps(id as HomepageLayoutItemId)} className={container}><ProductListSection sectionId={id} config={config} data={listsData[index]} display={pageDisplay} editable={editable} /></div>)}

    {popularFeed.items.length > 0 && <div {...sectionProps("BEST_SELLING_PRODUCTS")} className={container}><HomepageBestSellers products={popularFeed.items} /></div>}

    {latestArticles.length > 0 && <div {...sectionProps("ARTICLES")} className={`${container} min-w-0 overflow-hidden rounded-2xl border border-[#e6e8ec] bg-white px-4 py-6 sm:px-6 lg:px-7 lg:py-8`}><HomepageLatestArticles articles={latestArticles} /></div>}

  </main>;
}
