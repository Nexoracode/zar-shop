import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { getSeoSettings } from "@/modules/settings/seo-settings";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { allowIndexing } = await getSeoSettings();
  const sitemap = `${env.APP_URL.replace(/\/$/, "")}/sitemap.xml`;

  if (!allowIndexing) {
    return { rules: { userAgent: "*", disallow: "/" }, sitemap };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/api", "/checkout", "/login", "/register"],
    },
    sitemap,
  };
}
