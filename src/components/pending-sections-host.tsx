"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BannerSlider } from "@/components/banner-slider";
import { CategoriesContent, categoriesSectionClass, type CategoryStripItem } from "@/components/categories-section";
import { StorefrontHeroSlider } from "@/components/storefront-hero-slider";
import { ProductListSection } from "@/components/product-list-section";
import { usePendingSections } from "@/components/pending-sections-store";
import { StorefrontImageTiles } from "@/components/storefront-image-tiles";
import type { BannerItem } from "@/modules/page-builder/banner-items";
import type { BannerSlide } from "@/modules/page-builder/banner-sliders";
import { isFullWidthLayout, isTileLayout } from "@/modules/page-builder/banners";
import type { ProductListData } from "@/modules/page-builder/product-list-data";
import type { ProductListConfig } from "@/modules/page-builder/product-lists";
import { arrangeCategories, type CategoriesSectionSettings } from "@/modules/page-builder/section-settings";
import { builderSectionProps } from "@/modules/page-builder/sections";
import type { HomepageLayoutItemId } from "@/modules/settings/homepage-settings";

// Each template has its own content width (the same strings its homepage uses).
const containers = {
  GENERAL: "mx-auto w-[min(var(--store-max-width),calc(100%-24px))] sm:w-[min(var(--store-max-width),calc(100%-40px))] lg:w-[min(var(--store-max-width),calc(100%-64px))]",
  GOLD: "mx-auto w-[min(var(--store-max-width),calc(100%-32px))] lg:w-[min(var(--store-max-width),calc(100%-80px))]",
} as const;

// The description as the builder's editor produced it, cleaned just enough for the admin's own preview; the server
// sanitises it properly when the section is saved.
function cleanPreviewHtml(html: string) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,link,meta,img,svg").forEach((node) => node.remove());
  doc.body.querySelectorAll("*").forEach((element) => {
    for (const attribute of [...element.attributes]) {
      if (/^on/i.test(attribute.name) || (attribute.name === "href" && /^\s*javascript:/i.test(attribute.value))) element.removeAttribute(attribute.name);
    }
  });
  return doc.body.innerHTML;
}

function PendingProductList({ id, config }: { id: string; config: ProductListConfig }) {
  const { source, categoryId, limit } = config;
  const key = `${source}|${categoryId ?? ""}|${limit}`;
  const [loaded, setLoaded] = useState<{ key: string; data: ProductListData } | null>(null);
  const description = useMemo(() => cleanPreviewHtml(config.description), [config.description]);

  // The products come from the server, like the real section's; whatever was loaded before stays until the new ones arrive.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/settings/product-lists/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layout: "SLIDER", title: "پیش‌نمایش", description: "", source, categoryId, limit }), signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ProductListData | null) => { if (data) setLoaded({ key, data }); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [key, source, categoryId, limit]);

  if (!loaded) return <p className="m-0 rounded-2xl border border-dashed border-[#d5d9e0] bg-white p-6 text-center text-sm text-[#858b95]">در حال بارگذاری پیش‌نمایش «{config.title}»…</p>;
  return <ProductListSection sectionId={id} config={config} descriptionHtml={description} data={loaded.data} display={{}} editable />;
}

function PendingCategories({ id, settings, categories, className }: { id: string; settings: CategoriesSectionSettings; categories: CategoryStripItem[]; className: string }) {
  const description = useMemo(() => cleanPreviewHtml(settings.description), [settings.description]);
  const items = arrangeCategories(categories, settings);
  return (
    <section {...builderSectionProps(id as HomepageLayoutItemId)} data-builder-draft="" className={`${className} ${categoriesSectionClass}`} aria-label="دسته‌بندی محصولات">
      <CategoriesContent sectionId={id} title={settings.title} descriptionHtml={description} moreLabel={settings.moreLabel} items={items} display={{}} editable />
    </section>
  );
}

function bannerSlides(items: BannerItem[]): BannerSlide[] {
  return items.flatMap((item) => item.desktopMedia
    ? [{ id: item.id, href: item.href, desktop: { src: item.desktopMedia.url, alt: item.desktopMedia.alt ?? item.desktopMedia.title }, mobile: item.mobileMedia ? { src: item.mobileMedia.url, alt: item.mobileMedia.alt ?? item.mobileMedia.title } : undefined }]
    : []);
}

function PendingBanner({ id, layout, items }: { id: string; layout: string; items: BannerItem[] }) {
  if (isTileLayout(layout)) {
    const group = { id, layout, tiles: items.map((item) => ({ id: item.id, href: item.href, mediaId: item.desktopMedia?.id ?? null, media: item.desktopMedia ? { id: item.desktopMedia.id, title: item.desktopMedia.title, alt: item.desktopMedia.alt ?? null, url: item.desktopMedia.url, type: "IMAGE" as const, mimeType: item.desktopMedia.mimeType ?? "" } : null })) };
    return <StorefrontImageTiles groups={[group]} editable />;
  }
  return <BannerSlider sectionId={id} layout={layout as Parameters<typeof BannerSlider>[0]["layout"]} slides={bannerSlides(items)} editable />;
}

/**
 * What the page builder changed and hasn't saved yet, drawn in the homepage like the real thing: the sections that were
 * added, and the existing sections whose content was edited (the builder's stylesheet hides their server-rendered
 * version). Their order and display switches come from that stylesheet, exactly as for the saved sections. Only mounted
 * for viewers who can edit the page.
 */
export function PendingSectionsHost({ industry, categories = [] }: { industry: "GOLD" | "GENERAL"; /** The categories the general template's strip picks from, for its draft copy. */ categories?: CategoryStripItem[] }) {
  const pending = usePendingSections();
  const container = containers[industry];
  // `data-builder-draft` marks these as the browser's copy, so the stylesheet that hides a replaced section spares them.
  const marks = (id: string) => ({ ...builderSectionProps(id as HomepageLayoutItemId), "data-builder-draft": "" });
  // A full-width banner runs edge to edge; everything else sits inside the store's content width.
  const wrap = (id: string, content: ReactNode, fullWidth: boolean) => industry === "GOLD"
    ? <section key={id} {...marks(id)} className="bg-white py-5 lg:py-10"><div className={fullWidth ? undefined : container}>{content}</div></section>
    : <div key={id} {...marks(id)} className={fullWidth ? undefined : container}>{content}</div>;
  return <>{Object.entries(pending).map(([id, section]) => {
    // The main slider is a full-bleed section of its own in both templates.
    if (section.kind === "hero") return <section key={id} {...marks(id)} className="bg-white"><StorefrontHeroSlider slides={bannerSlides(section.items)} contentMode={section.content.contentMode} title={section.content.title} description={section.content.description} buttonLabel={section.content.buttonLabel} editable /></section>;
    if (section.kind === "categories" || section.kind === "strip") return <PendingCategories key={id} id={id} settings={section.settings} categories={categories} className={container} />;
    if (section.kind === "list") return wrap(id, <PendingProductList id={id} config={section.config} />, false);
    return wrap(id, <PendingBanner id={id} layout={section.layout} items={section.items} />, section.kind === "banner" && isFullWidthLayout(section.layout));
  })}</>;
}
