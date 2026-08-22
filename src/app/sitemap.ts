import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { contentPageMeta, getContentSettings } from "@/modules/settings/content-settings";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.APP_URL;
  const [settings, content, products] = await Promise.all([
    getGeneralStoreSettings(),
    getContentSettings(),
    db.product.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/products`, changeFrequency: "hourly", priority: 0.9 },
  ];

  const publishedPages = content.pages.filter((page) => page.published);
  const pageEntries: MetadataRoute.Sitemap = publishedPages.map((page) => ({
    url: `${baseUrl}/pages/${contentPageMeta[page.id].slug}`,
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  const faqEntries: MetadataRoute.Sitemap = content.faqs.some((item) => item.enabled)
    ? [{ url: `${baseUrl}/pages/faq`, changeFrequency: "monthly", priority: 0.4 }]
    : [];

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return settings.isStoreActive
    ? [...staticEntries, ...pageEntries, ...faqEntries, ...productEntries]
    : staticEntries;
}
