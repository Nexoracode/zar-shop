import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { SitePromoBanner } from "@/components/site-promo-banner";
import { AppChrome } from "@/components/app-chrome";
import { AppToasts } from "@/components/app-toasts";
import { RouteProgressBar } from "@/components/route-progress-bar";
import { getCurrentUser } from "@/modules/auth/session";
import { getGeneralStoreSettings, isStorefrontAvailable } from "@/modules/settings/general-settings";
import { getHomepageSettings } from "@/modules/settings/homepage-settings";
import { brandCssVariables, getBrandSettings } from "@/modules/settings/brand-settings";
import { getSeoSettings } from "@/modules/settings/seo-settings";
import { adminRoles } from "@/modules/auth/permissions";
import { StorefrontFooter, StorefrontHeader } from "@/storefront/resolve-chrome";
import { env } from "@/lib/env";
import "./globals.css";

// The page shape here (storefront vs. maintenance/setup screen) depends on the viewer's role
// (an admin can preview a paused store), so the root layout genuinely needs a per-request
// session read — same judgment call as /admin and /account. The settings reads below are
// cached across requests regardless (see the settings modules), so this doesn't reintroduce
// the DB load the caching migration set out to remove.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  "use cache";
  cacheLife("hours");
  const [settings, brand, seo] = await Promise.all([getGeneralStoreSettings(), getBrandSettings(), getSeoSettings()]);
  // A configured, build-time-known origin (not a per-request headers() read) so this function
  // stays cacheable under Cache Components — matches the pattern already used for article URLs.
  // Kept as a plain string (not `new URL(...)`), since this function is "use cache" and a URL
  // instance can't be serialized across that boundary (RSC/Client Component serialization
  // rejects class instances).
  const baseUrl = env.APP_URL.replace(/\/$/, "");
  const defaultOgImage = `${baseUrl}/og.png`;
  const description = seo.metaDescription || settings.shortDescription;
  return {
    // Per Next's own "use cache" + generateMetadata guidance: return metadataBase as a string,
    // not `new URL(...)` — a URL instance isn't serializable across a Cache Function boundary.
    metadataBase: baseUrl,
    title: { default: seo.metaTitle || settings.storeName, template: `%s | ${settings.storeName}` },
    description,
    // Global indexing kill-switch from the SEO settings; per-URL noindex is applied as an
    // `X-Robots-Tag` header in `src/proxy.ts`.
    robots: seo.allowIndexing ? undefined : { index: false, follow: false },
    icons: brand.faviconMedia ? { icon: brand.faviconMedia.url } : undefined,
    openGraph: { title: `${settings.storeName} | ${settings.tagline}`, description, type: "website", locale: "fa_IR", images: [{ url: brand.socialImageMedia?.url ?? defaultOgImage, width: 1200, height: 630, alt: `${settings.storeName}؛ ${settings.tagline}` }] },
    twitter: { card: "summary_large_image", title: `${settings.storeName} | ${settings.tagline}`, description, images: [brand.socialImageMedia?.url ?? defaultOgImage] },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, homepageSettings, brandSettings, user] = await Promise.all([getGeneralStoreSettings(), getHomepageSettings(), getBrandSettings(), getCurrentUser()]);
  const viewerIsAdmin = Boolean(user && adminRoles.includes(user.role));
  return (
    <html lang="fa" dir="rtl" data-theme="zar" data-scroll-behavior="smooth">
      <body style={brandCssVariables(brandSettings)}>
        <RouteProgressBar />
        <AppChrome
          header={<><SitePromoBanner settings={homepageSettings} /><StorefrontHeader settings={settings} brand={brandSettings} user={user} menuItems={homepageSettings.menuItems} /></>}
          footer={<StorefrontFooter settings={settings} brand={brandSettings} />}
          storefrontAvailable={isStorefrontAvailable(settings, user?.role)}
          maintenanceMode={settings.maintenanceMode}
          setupIncomplete={!settings.setupComplete}
          viewerIsAdmin={viewerIsAdmin}
          storeName={settings.storeName}
          brandStyle={brandCssVariables(brandSettings)}
          compactMobileGrid={brandSettings.compactMobileGrid}
        >
          {children}
        </AppChrome>
        <AppToasts />
      </body>
    </html>
  );
}
