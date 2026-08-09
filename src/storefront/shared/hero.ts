import type { StorefrontHeroSlide } from "@/components/storefront-hero-slider";
import type { HomepageSettings } from "@/modules/settings/homepage-settings";

export function buildStorefrontHeroSlides(settings: HomepageSettings, fallbackImage: string): StorefrontHeroSlide[] {
  const configured = settings.heroSlides.flatMap((slide) => slide.desktopMedia ? [{
    id: slide.id,
    href: slide.href,
    desktop: { src: slide.desktopMedia.url, alt: slide.desktopMedia.alt ?? settings.heroTitle },
    mobile: slide.mobileMedia ? { src: slide.mobileMedia.url, alt: slide.mobileMedia.alt ?? settings.heroTitle } : undefined,
  }] : []);
  if (configured.length) return configured;
  return [{
    id: "fallback",
    href: settings.heroButtonHref,
    desktop: { src: settings.heroDesktopMedia?.url ?? fallbackImage, alt: settings.heroDesktopMedia?.alt ?? settings.heroTitle },
    mobile: settings.heroMobileMedia ? { src: settings.heroMobileMedia.url, alt: settings.heroMobileMedia.alt ?? settings.heroTitle } : undefined,
  }];
}
