import type { Metadata } from "next";
import { connection } from "next/server";
import { PageBuilder } from "@/components/page-builder";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { getHomepageMenuLinkOptions, getHomepageSettings } from "@/modules/settings/homepage-settings";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getPageDisplaySettings } from "@/modules/page-builder/display-settings";
import { getPageSectionSettings } from "@/modules/page-builder/section-settings-store";
import { getStoreIndustry } from "@/modules/settings/store-settings";
import { resolveStorefrontHome } from "@/storefront/resolve-storefront";
import { env } from "@/lib/env";

export function generateMetadata(): Metadata {
  return { alternates: { canonical: env.APP_URL } };
}

type HomepageMedia = { id: string; title: string | null; alt: string | null; url: string; mimeType: string } | null;

function toMediaChoice(media: HomepageMedia) {
  return media ? { id: media.id, title: media.title || media.alt || "تصویر صفحه اصلی", alt: media.alt, url: media.url, type: "IMAGE" as const, mimeType: media.mimeType } : null;
}

export default async function HomePage() {
  // The product feed rendered by StorefrontHome flags each card's favorite state per viewer
  // (getStorefrontFlashDeals → markFavoriteCards → getCurrentUser), and that cookies() read
  // happens after other uncached DB reads in the same data-fetch chain, so it can't establish
  // dynamic rendering on its own during prerendering. `connection()` marks this render as
  // request-time explicitly, before any of that runs. A static shell would need decoupling
  // favorites-flagging from the base product feed — a separate, larger change.
  await connection();
  const StorefrontHome = await resolveStorefrontHome();
  // The page builder edits store-wide homepage configuration, which is the `settings:manage`
  // permission (ADMIN only) — the same gate as the admin homepage settings pages.
  const user = await getCurrentUser();
  const canEditPages = Boolean(user && hasPermission(user.role, "settings:manage"));
  const [homepage, display, industry, general, brand, menuLinkOptions, sectionSettings] = canEditPages ? await Promise.all([getHomepageSettings(), getPageDisplaySettings(), getStoreIndustry(), getGeneralStoreSettings(), getBrandSettings(), getHomepageMenuLinkOptions(), getPageSectionSettings()]) : [];
  return (
    <>
      <StorefrontHome editable={canEditPages} />
      {homepage && display && industry && general && brand && menuLinkOptions && sectionSettings ? (
        <PageBuilder
          initialSections={homepage.sections}
          initialDisplay={display}
          industry={industry}
          identity={{ storeName: general.storeName, tagline: general.tagline, logo: brand.mainLogoMedia ? { id: brand.mainLogoMedia.id, title: brand.mainLogoMedia.title || brand.mainLogoMedia.alt || "لوگو", alt: brand.mainLogoMedia.alt, url: brand.mainLogoMedia.url, type: "IMAGE", mimeType: brand.mainLogoMedia.mimeType } : null }}
          menu={{ items: homepage.menuItems, linkOptions: menuLinkOptions }}
          categories={sectionSettings.categories}
          hero={{
            contentMode: homepage.heroContentMode,
            title: homepage.heroTitle,
            description: homepage.heroDescription,
            buttonLabel: homepage.heroButtonLabel,
            buttonHref: homepage.heroButtonHref,
            slides: homepage.heroSlides.map((slide) => ({ id: slide.id, href: slide.href, desktopMedia: toMediaChoice(slide.desktopMedia), mobileMedia: toMediaChoice(slide.mobileMedia) })),
          }}
        />
      ) : null}
    </>
  );
}
