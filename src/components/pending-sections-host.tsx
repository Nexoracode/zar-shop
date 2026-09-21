"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BannerSlider } from "@/components/banner-slider";
import { ProductListSection } from "@/components/product-list-section";
import { usePendingSections } from "@/components/pending-sections-store";
import { StorefrontImageTiles } from "@/components/storefront-image-tiles";
import type { BannerItem } from "@/modules/page-builder/banner-items";
import type { BannerSlide } from "@/modules/page-builder/banner-sliders";
import { isFullWidthLayout, isTileLayout } from "@/modules/page-builder/banners";
import type { ProductListData } from "@/modules/page-builder/product-list-data";
import type { ProductListConfig } from "@/modules/page-builder/product-lists";
import { builderSectionProps } from "@/modules/page-builder/sections";
import type { HomepageLayoutItemId } from "@/modules/settings/homepage-settings";

const container = "mx-auto w-[min(var(--store-max-width),calc(100%-32px))] lg:w-[min(var(--store-max-width),calc(100%-80px))]";

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
 * The sections that were added in the page builder and are not saved yet, drawn in the homepage like the real ones so
 * the draft can be seen and arranged. Their order and display switches come from the builder's stylesheet, exactly as
 * for the saved sections. Only mounted for viewers who can edit the page.
 */
export function PendingSectionsHost({ industry }: { industry: "GOLD" | "GENERAL" }) {
  const pending = usePendingSections();
  // A full-width banner runs edge to edge; everything else sits inside the store's content width.
  const wrap = (id: string, content: ReactNode, fullWidth: boolean) => industry === "GOLD"
    ? <section key={id} {...builderSectionProps(id as HomepageLayoutItemId)} className="bg-white py-5 lg:py-10"><div className={fullWidth ? undefined : container}>{content}</div></section>
    : <div key={id} {...builderSectionProps(id as HomepageLayoutItemId)} className={fullWidth ? undefined : container}>{content}</div>;
  return <>{Object.entries(pending).map(([id, section]) => wrap(id, section.kind === "list" ? <PendingProductList id={id} config={section.config} /> : <PendingBanner id={id} layout={section.layout} items={section.items} />, section.kind === "banner" && isFullWidthLayout(section.layout)))}</>;
}
