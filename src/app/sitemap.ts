import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { contentPageMeta, getContentSettings } from "@/modules/settings/content-settings";
import { SITEMAP_TAG } from "@/modules/seo/revalidate";

// No `changeFrequency` / `priority`: Google ignores both. `lastModified` is `updatedAt` when
// set, otherwise `createdAt`. Cached for 4 hours and busted by `revalidateTag("sitemap")` on
// any product / content / SEO-rule change.
const buildSitemap = unstable_cache(
  async (): Promise<MetadataRoute.Sitemap> => {
    const baseUrl = env.APP_URL.replace(/\/$/, "");

    const [noindex, canonicalSources, gone, redirectSources] = await Promise.all([
      db.seoNoindex.findMany({ select: { url: true } }).then((rows) => new Set(rows.map((r) => r.url))),
      db.seoCanonical.findMany({ select: { sourceUrl: true } }).then((rows) => new Set(rows.map((r) => r.sourceUrl))),
      db.seoGonePage.findMany({ select: { url: true } }).then((rows) => new Set(rows.map((r) => r.url))),
      db.seoRedirect.findMany({ select: { fromUrl: true } }).then((rows) => new Set(rows.map((r) => r.fromUrl))),
    ]);

    // A URL belongs in the sitemap only if it returns 200, is not noindexed, and is
    // self-canonical (not pointing its canonical elsewhere).
    const isEligible = (path: string) =>
      !noindex.has(path) && !canonicalSources.has(path) && !gone.has(path) && !redirectSources.has(path);

    const entry = (path: string, lastModified?: Date): MetadataRoute.Sitemap[number] | null =>
      isEligible(path) ? { url: `${baseUrl}${path === "/" ? "" : path}`, lastModified: lastModified ?? new Date() } : null;

    const [settings, content, products] = await Promise.all([
      getGeneralStoreSettings(),
      getContentSettings(),
      db.product.findMany({
        where: { status: "ACTIVE" },
        select: { slug: true, updatedAt: true, createdAt: true },
        orderBy: { updatedAt: "desc" },
        take: 50_000,
      }),
    ]);

    const staticEntries = [entry("/"), entry("/products")];

    if (!settings.isStoreActive) {
      return staticEntries.filter((item): item is NonNullable<typeof item> => item !== null);
    }

    const pageEntries = content.pages
      .filter((page) => page.published)
      .map((page) => entry(`/pages/${contentPageMeta[page.id].slug}`));

    const faqEntries = content.faqs.some((faq) => faq.enabled) ? [entry("/pages/faq")] : [];

    const productEntries = products.map((product) =>
      entry(`/products/${product.slug}`, product.updatedAt ?? product.createdAt),
    );

    return [...staticEntries, ...pageEntries, ...faqEntries, ...productEntries]
      .filter((item): item is NonNullable<typeof item> => item !== null);
  },
  ["sitemap"],
  { revalidate: 60 * 60 * 4, tags: [SITEMAP_TAG] },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap();
}
