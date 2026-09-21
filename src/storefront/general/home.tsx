import { CategoriesContent, categoriesSectionClass, toCategoryStripItem } from "@/components/categories-section";
import { HomepageBrands } from "@/components/homepage-brands";
import { HomepageLatestArticles } from "@/components/homepage-latest-articles";
import { HomepageBestSellers } from "@/components/homepage-best-sellers";
import { PendingSectionsHost } from "@/components/pending-sections-host";
import { ProductListSection } from "@/components/product-list-section";
import { StorefrontHeroSlider } from "@/components/storefront-hero-slider";
import { StorefrontImageTiles } from "@/components/storefront-image-tiles";
import { db } from "@/lib/db";
import { getLatestPublishedArticles } from "@/modules/articles/service";
import { builderSectionProps } from "@/modules/page-builder/sections";
import { isPartHidden } from "@/modules/page-builder/display-parts";
import { BannerSlider } from "@/components/banner-slider";
import { getBannerSetData } from "@/modules/page-builder/banner-slider-data";
import { isFullWidthLayout, isTileLayout } from "@/modules/page-builder/banners";
import { getProductListData } from "@/modules/page-builder/product-list-data";
import { sanitizeSectionDescription } from "@/modules/page-builder/rich-text-sanitize";
import { getStorefrontProductFeed } from "@/modules/products/storefront-feed";
import { arrangeCategories } from "@/modules/page-builder/section-settings";
import { getPageSectionSettings } from "@/modules/page-builder/section-settings-store";
import { pageSectionLimits } from "@/modules/settings/settings-limits";
import { getPageDisplaySettings } from "@/modules/page-builder/display-settings";
import { isSectionHiddenAtRender } from "@/modules/page-builder/layout-draft";
import { getHomepageSettings, type HomepageLayoutItemId } from "@/modules/settings/homepage-settings";
import { buildStorefrontHeroSlides } from "@/storefront/shared/hero";

const container = "mx-auto w-[min(var(--store-max-width),calc(100%-24px))] sm:w-[min(var(--store-max-width),calc(100%-40px))] lg:w-[min(var(--store-max-width),calc(100%-64px))]";

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
  // Cleaned again here, however it was stored: this is the one place the description's HTML reaches the page.
  const categoriesDescription = sanitizeSectionDescription(sectionSettings.CATEGORIES.description);
  const heroSlides = buildStorefrontHeroSlides(homepage, "/images/zar-hero-campaign.png");
  const sectionById = new Map(homepage.sections.map((section) => [section.id, section]));
  const sectionOrder = new Map(homepage.sections.map((section, index) => [section.id, index]));
  // A section still being made in the page builder is a draft: only the people editing the page see it.
  const isShown = (id: string) => editable || !sectionSettings.draftSectionIds.includes(id);
  const sectionProps = (id: HomepageLayoutItemId) => ({ ...builderSectionProps(id), hidden: isSectionHiddenAtRender(sectionById.get(id), editable), style: { order: sectionOrder.get(id) ?? homepage.sections.length } });

  return <main className="flex flex-col gap-4 overflow-hidden bg-[#f4f5f7] pb-[78px] pt-3 lg:gap-6 lg:pb-8">
    <section {...sectionProps("HERO")} className="bg-white"><StorefrontHeroSlider slides={heroSlides} contentMode={homepage.heroContentMode} title={homepage.heroTitle} description={homepage.heroDescription} buttonLabel={homepage.heroButtonLabel} arrowsHidden={isPartHidden(pageDisplay, "HERO", "arrows")} dotsHidden={isPartHidden(pageDisplay, "HERO", "dots")} editable={editable} /></section>

    {homepage.tileGroups.map((group) => (editable || group.tiles.some((tile) => tile.media)) && <section key={group.id} {...sectionProps(`TILE_GROUP:${group.id}`)} className={container} aria-label="پیشنهادهای تصویری"><StorefrontImageTiles groups={[group]} editable={editable} /></section>)}

    {categories.length > 0 && <section {...sectionProps("CATEGORIES")} className={`${container} ${categoriesSectionClass}`} aria-label="دسته‌بندی محصولات"><CategoriesContent title={sectionSettings.CATEGORIES.title} descriptionHtml={categoriesDescription} items={categories.map(toCategoryStripItem)} display={pageDisplay} editable={editable} /></section>}

    {brands.length > 0 && <div {...sectionProps("BRANDS")} className={container}><HomepageBrands brands={brands} /></div>}

    {Object.entries(sectionSettings.bannerSliders).map(([id, slider]) => isShown(id) && (isTileLayout(slider.layout)
      ? (editable || bannerSets.tileGroups[id].tiles.some((tile) => tile.media)) && <section key={id} {...sectionProps(id as HomepageLayoutItemId)} className={container} aria-label="پیشنهادهای تصویری"><StorefrontImageTiles groups={[bannerSets.tileGroups[id]]} editable={editable} /></section>
      : (bannerSets.slides[id].length > 0 || editable) && <div key={id} {...sectionProps(id as HomepageLayoutItemId)} className={isFullWidthLayout(slider.layout) ? undefined : container}><BannerSlider sectionId={id} layout={slider.layout} slides={bannerSets.slides[id]} arrowsHidden={isPartHidden(pageDisplay, id, "arrows")} dotsHidden={isPartHidden(pageDisplay, id, "dots")} editable={editable} /></div>))}

    {productLists.map(([id, config], index) => isShown(id) && (listsData[index].products.length > 0 || editable) && <div key={id} {...sectionProps(id as HomepageLayoutItemId)} className={container}><ProductListSection sectionId={id} config={config} descriptionHtml={sanitizeSectionDescription(config.description)} data={listsData[index]} display={pageDisplay} editable={editable} /></div>)}

    {popularFeed.items.length > 0 && <div {...sectionProps("BEST_SELLING_PRODUCTS")} className={container}><HomepageBestSellers products={popularFeed.items} /></div>}

    {latestArticles.length > 0 && <div {...sectionProps("ARTICLES")} className={`${container} min-w-0 overflow-hidden rounded-2xl border border-[#e6e8ec] bg-white px-4 py-6 sm:px-6 lg:px-7 lg:py-8`}><HomepageLatestArticles articles={latestArticles} /></div>}

    {editable && <PendingSectionsHost industry="GENERAL" categories={allCategories.map(toCategoryStripItem)} />}
  </main>;
}
