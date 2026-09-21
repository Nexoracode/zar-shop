import { z } from "zod";
import type { DisplayPart, SectionDisplayConfig } from "@/modules/page-builder/display-parts";
import { bannerLayouts, bannerSliderMaxSlides, bannerTileCount, isSliderLayout, isTileLayout, type BannerLayout } from "@/modules/page-builder/banners";
import { safeHrefSchema } from "@/modules/settings/safe-href";

// Banners added from the page builder (the main slider and the older tile rows keep their own storage and admin pages).
// Each is a homepage section with the id `BANNER_SLIDER:<uuid>` — whatever its look, a slider or a row of tiles — stored
// in `pageSectionSettings.BANNER_SLIDERS` by that id.

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
  layout: z.enum(bannerLayouts, { error: "ظاهر بنر را انتخاب کنید." }),
  slides: z.array(bannerSlideSchema).max(bannerSliderMaxSlides).refine((slides) => new Set(slides.map((slide) => slide.id)).size === slides.length, "شناسه بنرها نباید تکراری باشد."),
}).superRefine((config, context) => {
  // A tile look has room for exactly its own number of banners.
  if (isTileLayout(config.layout) && config.slides.length > bannerTileCount[config.layout]) {
    context.addIssue({ code: "custom", path: ["slides"], message: `این ظاهر بیش از ${bannerTileCount[config.layout].toLocaleString("fa-IR")} بنر ندارد.` });
  }
});
export type BannerSliderConfig = z.infer<typeof bannerSliderConfigSchema>;

/** A slide as the storefront draws it: the pictures already resolved to URLs. */
export type BannerSlide = { id: string; href: string; desktop: { src: string; alt: string }; mobile?: { src: string; alt: string } };

export function newBannerSliderConfig(layout: BannerLayout): BannerSliderConfig {
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

/** The display switches of a banner set: a slider's arrows (the peeking look has none) and dots; tile looks have none. */
export function bannerSliderDisplayConfig(config: Pick<BannerSliderConfig, "layout">): SectionDisplayConfig {
  if (!isSliderLayout(config.layout)) return { parts: [], master: "layout" };
  const parts: DisplayPart[] = [];
  if (config.layout !== "SLIDER_PEEK") parts.push({ id: "arrows", label: "نمایش فلش‌ها" });
  parts.push({ id: "dots", label: "نمایش نقطه‌ها" });
  return { parts, master: "layout" };
}
