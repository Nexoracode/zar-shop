import { revalidateTag } from "next/cache";

// `src/app/sitemap.ts` caches its output under this tag; every CMS write that can change what
// belongs in the sitemap (products, content pages, SEO rules) calls this afterwards.
export const SITEMAP_TAG = "sitemap";

export function revalidateSitemap() {
  revalidateTag(SITEMAP_TAG, "max");
}
