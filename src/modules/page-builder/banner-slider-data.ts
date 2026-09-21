import { db } from "@/lib/db";
import type { BannerSlide, BannerSliderConfig } from "@/modules/page-builder/banner-sliders";

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
