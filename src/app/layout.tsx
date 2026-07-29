import type { Metadata } from "next";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AppChrome } from "@/components/app-chrome";
import { AppToasts } from "@/components/app-toasts";
import { getCurrentUser } from "@/modules/auth/session";
import { getGeneralStoreSettings, isStorefrontAvailable } from "@/modules/settings/general-settings";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const [requestHeaders, settings] = await Promise.all([headers(), getGeneralStoreSettings()]);
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = new URL(`${protocol}://${host}`);
  const description = settings.shortDescription;
  return {
    metadataBase: baseUrl,
    title: { default: settings.storeName, template: `%s | ${settings.storeName}` },
    description,
    openGraph: { title: `${settings.storeName} | ${settings.tagline}`, description, type: "website", locale: "fa_IR", images: [{ url: new URL("/og.png", baseUrl), width: 1792, height: 1024, alt: `${settings.storeName}؛ ${settings.tagline}` }] },
    twitter: { card: "summary_large_image", title: `${settings.storeName} | ${settings.tagline}`, description, images: [new URL("/og.png", baseUrl)] },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, user] = await Promise.all([getGeneralStoreSettings(), getCurrentUser()]);
  return (
    <html lang="fa" dir="rtl" data-theme="zar" data-scroll-behavior="smooth">
      <body>
        <AppChrome
          header={<SiteHeader settings={settings} user={user} />}
          footer={<SiteFooter settings={settings} />}
          storefrontAvailable={isStorefrontAvailable(settings, user?.role)}
          maintenanceMode={settings.maintenanceMode}
          storeName={settings.storeName}
        >
          {children}
        </AppChrome>
        <AppToasts />
      </body>
    </html>
  );
}
