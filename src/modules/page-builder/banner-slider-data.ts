import { db } from "@/lib/db";
import type { MediaChoice } from "@/components/media-library";
import { isSliderLayout, isTileLayout } from "@/modules/page-builder/banners";
import type { BannerSlide, BannerSliderConfig } from "@/modules/page-builder/banner-sliders";
import type { BannerItem } from "@/modules/page-builder/banner-items";
import type { HomepageSettings } from "@/modules/settings/homepage-settings";

type TileGroup = HomepageSettings["tileGroups"][number];

async function loadMedia(sliders: Record<string, BannerSliderConfig>) {
  const mediaIds = [...new Set(Object.values(sliders).flatMap((slider) => slider.slides.flatMap((slide) => [slide.desktopMediaId, slide.mobileMediaId])).filter((id): id is string => Boolean(id)))];
  const media = mediaIds.length ? await db.mediaAsset.findMany({ where: { id: { in: mediaIds }, scope: "HOMEPAGE", type: "IMAGE" }, select: { id: true, url: true, alt: true, title: true, mimeType: true } }) : [];
  return new Map(media.map((item) => [item.id, item]));
}

/**
 * The storefront's view of the added banner sets, pictures resolved to URLs: the slides of each slider (those without a
 * valid desktop picture are dropped) and, for each tile look, the row of tiles (an empty tile keeps its slot).
 */
export async function getBannerSetData(sliders: Record<string, BannerSliderConfig>): Promise<{ slides: Record<string, BannerSlide[]>; tileGroups: Record<string, TileGroup> }> {
  const byId = await loadMedia(sliders);
  const picture = (id: string | null) => {
    const item = id ? byId.get(id) : undefined;
    return item ? { src: item.url, alt: item.alt ?? item.title ?? "بنر" } : undefined;
  };
  const slides: Record<string, BannerSlide[]> = {};
  const tileGroups: Record<string, TileGroup> = {};
  for (const [id, slider] of Object.entries(sliders)) {
    if (isSliderLayout(slider.layout)) {
      slides[id] = slider.slides.flatMap((slide) => {
        const desktop = picture(slide.desktopMediaId);
        return desktop ? [{ id: slide.id, href: slide.href, desktop, mobile: picture(slide.mobileMediaId) }] : [];
      });
    } else if (isTileLayout(slider.layout)) {
      tileGroups[id] = {
        id,
        layout: slider.layout,
        tiles: slider.slides.map((slide) => {
          const item = slide.desktopMediaId ? byId.get(slide.desktopMediaId) : undefined;
          return { id: slide.id, href: slide.href, mediaId: slide.desktopMediaId, media: item ? { id: item.id, title: item.title, alt: item.alt, url: item.url, type: "IMAGE" as const, mimeType: item.mimeType } : null };
        }),
      };
    }
  }
  return { slides, tileGroups };
}

/** The sets' banners as the page builder's forms hold them (pictures as media-library choices). */
export async function getBannerSliderEditViews(sliders: Record<string, BannerSliderConfig>): Promise<Record<string, { layout: BannerSliderConfig["layout"]; items: BannerItem[] }>> {
  const byId = await loadMedia(sliders);
  const choice = (id: string | null): MediaChoice | null => {
    const item = id ? byId.get(id) : undefined;
    return item ? { id: item.id, title: item.title || item.alt || "تصویر بنر", alt: item.alt, url: item.url, type: "IMAGE", mimeType: item.mimeType } : null;
  };
  return Object.fromEntries(Object.entries(sliders).map(([id, slider]) => [id, { layout: slider.layout, items: slider.slides.map((slide) => ({ id: slide.id, href: slide.href, desktopMedia: choice(slide.desktopMediaId), mobileMedia: choice(slide.mobileMediaId) })) }]));
}
