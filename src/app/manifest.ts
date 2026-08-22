import type { MetadataRoute } from "next";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getBrandSettings } from "@/modules/settings/brand-settings";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [settings, brand] = await Promise.all([getGeneralStoreSettings(), getBrandSettings()]);
  const icons = brand.faviconMedia
    ? [{ src: brand.faviconMedia.url, sizes: "any", type: brand.faviconMedia.mimeType }]
    : [];

  return {
    name: settings.storeName,
    short_name: settings.storeName,
    description: settings.shortDescription,
    start_url: "/",
    display: "standalone",
    background_color: brand.brandBackgroundColor,
    theme_color: brand.brandPrimaryColor,
    lang: "fa",
    dir: "rtl",
    icons,
  };
}
