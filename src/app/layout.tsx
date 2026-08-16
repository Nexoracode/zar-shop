import type { Metadata } from "next";
import { headers } from "next/headers";
import { SitePromoBanner } from "@/components/site-promo-banner";
import { AppChrome } from "@/components/app-chrome";
import { AppToasts } from "@/components/app-toasts";
import { getCurrentUser } from "@/modules/auth/session";
import { getGeneralStoreSettings, isStorefrontAvailable } from "@/modules/settings/general-settings";
import { getHomepageSettings } from "@/modules/settings/homepage-settings";
import { brandCssVariables, getBrandSettings } from "@/modules/settings/brand-settings";
import { StorefrontFooter, StorefrontHeader } from "@/storefront/resolve-chrome";
import "./globals.css";

// The root layout reads tenant/store settings from MySQL for every request.
// Keeping the segment dynamic prevents build-time database rendering and stale branding.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [requestHeaders, settings, brand] = await Promise.all([headers(), getGeneralStoreSettings(), getBrandSettings()]);
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = new URL(`${protocol}://${host}`);
  const description = settings.shortDescription;
  return {
    metadataBase: baseUrl,
    title: { default: settings.storeName, template: `%s | ${settings.storeName}` },
    description,
    icons: brand.faviconMedia ? { icon: brand.faviconMedia.url } : undefined,
    openGraph: { title: `${settings.storeName} | ${settings.tagline}`, description, type: "website", locale: "fa_IR", images: [{ url: brand.socialImageMedia?.url ?? new URL("/og.png", baseUrl), width: 1200, height: 630, alt: `${settings.storeName}؛ ${settings.tagline}` }] },
    twitter: { card: "summary_large_image", title: `${settings.storeName} | ${settings.tagline}`, description, images: [brand.socialImageMedia?.url ?? new URL("/og.png", baseUrl)] },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, homepageSettings, brandSettings, user] = await Promise.all([getGeneralStoreSettings(), getHomepageSettings(), getBrandSettings(), getCurrentUser()]);
  return (
    <html lang="fa" dir="rtl" data-theme="zar" data-scroll-behavior="smooth">
      <body style={brandCssVariables(brandSettings)}>
        <AppChrome
          header={<><SitePromoBanner settings={homepageSettings} /><StorefrontHeader settings={settings} brand={brandSettings} user={user} menuItems={homepageSettings.menuItems} /></>}
          footer={<StorefrontFooter settings={settings} brand={brandSettings} />}
          storefrontAvailable={isStorefrontAvailable(settings, user?.role)}
          maintenanceMode={settings.maintenanceMode}
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
