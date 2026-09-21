import { db } from "@/lib/db";
import type { MediaChoice } from "@/components/media-library";
import type { BannerSlide, BannerSliderConfig } from "@/modules/page-builder/banner-sliders";
import type { BannerItem } from "@/modules/page-builder/banner-items";

/** The slides of the given sliders with their pictures resolved (slides without a valid desktop picture are dropped). */
export async function getBannerSlidesById(sliders: Record<string, BannerSliderConfig>): Promise<Record<string, BannerSlide[]>> {
  const mediaIds = [...new Set(Object.values(sliders).flatMap((slider) => slider.slides.flatMap((slide) => [slide.desktopMediaId, slide.mobileMediaId])).filter((id): id is string => Boolean(id)))];
  const media = mediaIds.length ? await db.mediaAsset.findMany({ where: { id: { in: mediaIds }, scope: "HOMEPAGE", type: "IMAGE" }, select: { id: true, url: true, alt: true, title: true } }) : [];
  const byId = new Map(media.map((item) => [item.id, item]));
  const picture = (id: string | null) => {
    const item = id ? byId.get(id) : undefined;
    return item ? { src: item.url, alt: item.alt ?? item.title ?? "بنر" } : undefined;
  };
  return Object.fromEntries(Object.entries(sliders).map(([id, slider]) => [id, slider.slides.flatMap((slide) => {
    const desktop = picture(slide.desktopMediaId);
    return desktop ? [{ id: slide.id, href: slide.href, desktop, mobile: picture(slide.mobileMediaId) }] : [];
  })]));
}

/** The sliders' banners as the page builder's forms hold them (pictures as media-library choices, even if unusable). */
export async function getBannerSliderEditViews(sliders: Record<string, BannerSliderConfig>): Promise<Record<string, { layout: BannerSliderConfig["layout"]; items: BannerItem[] }>> {
  const mediaIds = [...new Set(Object.values(sliders).flatMap((slider) => slider.slides.flatMap((slide) => [slide.desktopMediaId, slide.mobileMediaId])).filter((id): id is string => Boolean(id)))];
  const media = mediaIds.length ? await db.mediaAsset.findMany({ where: { id: { in: mediaIds }, scope: "HOMEPAGE", type: "IMAGE" }, select: { id: true, url: true, alt: true, title: true, mimeType: true } }) : [];
  const byId = new Map(media.map((item) => [item.id, item]));
  const choice = (id: string | null): MediaChoice | null => {
    const item = id ? byId.get(id) : undefined;
    return item ? { id: item.id, title: item.title || item.alt || "تصویر بنر", alt: item.alt, url: item.url, type: "IMAGE", mimeType: item.mimeType } : null;
  };
  return Object.fromEntries(Object.entries(sliders).map(([id, slider]) => [id, { layout: slider.layout, items: slider.slides.map((slide) => ({ id: slide.id, href: slide.href, desktopMedia: choice(slide.desktopMediaId), mobileMedia: choice(slide.mobileMediaId) })) }]));
}
