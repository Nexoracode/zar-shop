import type { MediaChoice } from "@/components/media-library";
import { safeHrefSchema } from "@/modules/settings/safe-href";

// What the page builder's slider forms work with, and how it maps back onto the hero settings API
// (`homepageHeroSettingsInputSchema`). The API takes the whole hero configuration at once, so the forms
// carry the fields they don't edit (content mode, title…) along untouched.
export type HeroSlideDraft = { id: string; href: string; desktopMedia: MediaChoice | null; mobileMedia: MediaChoice | null };
export type HeroValues = {
  contentMode: "WITH_CONTENT" | "IMAGE_ONLY";
  title: string;
  description: string;
  buttonLabel: string;
  buttonHref: string;
  slides: HeroSlideDraft[];
};

/**
 * The body of `PATCH /api/admin/settings/homepage/hero` for `slides`. The first banner also fills the legacy
 * single-image fields, exactly as the admin hero page does.
 */
export function heroSettingsPayload(hero: Omit<HeroValues, "slides">, slides: HeroSlideDraft[]) {
  return {
    heroContentMode: hero.contentMode,
    heroTitle: hero.title,
    heroDescription: hero.description,
    heroButtonLabel: hero.buttonLabel,
    heroButtonHref: slides[0]?.href.trim() || hero.buttonHref,
    heroDesktopMediaId: slides[0]?.desktopMedia?.id ?? null,
    heroMobileMediaId: slides[0]?.mobileMedia?.id ?? null,
    heroSlides: slides.map((slide) => ({ id: slide.id, href: slide.href.trim(), desktopMediaId: slide.desktopMedia?.id ?? null, mobileMediaId: slide.mobileMedia?.id ?? null })),
  };
}

export type HeroSlideErrors = Partial<Record<"desktop" | "href", string>>;

/** A banner needs a desktop image (the storefront skips those without one) and a safe link. */
export function validateHeroSlide(slide: HeroSlideDraft): HeroSlideErrors {
  const errors: HeroSlideErrors = {};
  if (!slide.desktopMedia) errors.desktop = "تصویر دسکتاپ بنر را انتخاب کنید.";
  const href = safeHrefSchema.safeParse(slide.href);
  if (!href.success) errors.href = slide.href.trim() ? href.error.issues[0].message : "لینک بنر را وارد کنید.";
  return errors;
}

const ordinalWords = ["یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه", "ده"];

/** "بنر شماره یک"… — how a banner is named in the builder's list (the slider holds at most ten). */
export function heroSlideLabel(index: number) {
  return `بنر شماره ${ordinalWords[index] ?? (index + 1).toLocaleString("fa-IR")}`;
}

// Sizes recommended for the banner images, derived from how the slider draws them: the desktop slider is full
// width and 440px tall, a mobile card is 180px tall and about as wide as two of them (2:1).
export const heroImageSizeHints = { desktop: "۱۹۲۰ × ۴۴۰", mobile: "۷۲۰ × ۳۶۰" } as const;
