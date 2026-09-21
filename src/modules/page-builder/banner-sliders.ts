import { z } from "zod";
import type { DisplayPart, SectionDisplayConfig } from "@/modules/page-builder/display-parts";
import { bannerSliderLayouts, bannerSliderMaxSlides, type BannerSliderLayout } from "@/modules/page-builder/banners";
import { safeHrefSchema } from "@/modules/settings/safe-href";

// Banner sliders added from the page builder (the main slider keeps its own storage and admin page). Each is a homepage
// section with the id `BANNER_SLIDER:<uuid>`, stored in `pageSectionSettings.BANNER_SLIDERS` by that id.

export const bannerSliderIdPattern = /^BANNER_SLIDER:[A-Za-z0-9-]{1,80}$/;
export function isBannerSliderId(id: string) {
  return bannerSliderIdPattern.test(id);
}
export function newBannerSliderId(uuid: string) {
  return `BANNER_SLIDER:${uuid}`;
}

export const bannerSlideSchema = z.object({
  id: z.string().trim().min(1).max(80),
  desktopMediaId: z.string().trim().min(1).nullable(),
  mobileMediaId: z.string().trim().min(1).nullable(),
  href: safeHrefSchema,
});
export type BannerSlideInput = z.infer<typeof bannerSlideSchema>;

export const bannerSliderConfigSchema = z.object({
  layout: z.enum(bannerSliderLayouts, { error: "ظاهر بنر را انتخاب کنید." }),
  slides: z.array(bannerSlideSchema).max(bannerSliderMaxSlides).refine((slides) => new Set(slides.map((slide) => slide.id)).size === slides.length, "شناسه بنرها نباید تکراری باشد."),
});
export type BannerSliderConfig = z.infer<typeof bannerSliderConfigSchema>;

/** A slide as the storefront draws it: the pictures already resolved to URLs. */
export type BannerSlide = { id: string; href: string; desktop: { src: string; alt: string }; mobile?: { src: string; alt: string } };

export function newBannerSliderConfig(layout: BannerSliderLayout): BannerSliderConfig {
  return { layout, slides: [] };
}

/** The added sliders of the store by section id; malformed entries are ignored. */
export function resolveBannerSliders(stored: unknown): Record<string, BannerSliderConfig> {
  const document = stored && typeof stored === "object" && !Array.isArray(stored) ? (stored as Record<string, unknown>) : {};
  const saved = document.BANNER_SLIDERS && typeof document.BANNER_SLIDERS === "object" && !Array.isArray(document.BANNER_SLIDERS) ? (document.BANNER_SLIDERS as Record<string, unknown>) : {};
  const result: Record<string, BannerSliderConfig> = {};
  for (const [id, value] of Object.entries(saved)) {
    if (!isBannerSliderId(id)) continue;
    const parsed = bannerSliderConfigSchema.safeParse(value);
    if (parsed.success) result[id] = parsed.data;
  }
  return result;
}

/** The display switches of a slider: its arrows (the peeking look has none) and its dots. */
export function bannerSliderDisplayConfig(config: BannerSliderConfig): SectionDisplayConfig {
  const parts: DisplayPart[] = [];
  if (config.layout !== "SLIDER_PEEK") parts.push({ id: "arrows", label: "نمایش فلش‌ها" });
  parts.push({ id: "dots", label: "نمایش نقطه‌ها" });
  return { parts, master: "layout" };
}
