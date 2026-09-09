import { db } from "@/lib/db";

// Rule sets consulted by `src/proxy.ts` on every storefront request. Proxy cannot use
// `fetch`/`unstable_cache` caching, so this keeps a plain module-level snapshot with a short
// TTL and an explicit bust the admin API routes call after a write.
export type SeoRuleSets = {
  redirects: Map<string, string>;
  gone: Set<string>;
  noindex: Set<string>;
  canonical: Map<string, string>;
};

const TTL_MS = 60_000;
let cache: { value: SeoRuleSets; at: number } | null = null;
let inFlight: Promise<SeoRuleSets> | null = null;

async function load(): Promise<SeoRuleSets> {
  const [redirects, gone, noindex, canonical] = await Promise.all([
    db.seoRedirect.findMany({ select: { fromUrl: true, toUrl: true } }),
    db.seoGonePage.findMany({ select: { url: true } }),
    db.seoNoindex.findMany({ select: { url: true } }),
    db.seoCanonical.findMany({ select: { sourceUrl: true, targetUrl: true } }),
  ]);
  return {
    redirects: new Map(redirects.map((row) => [row.fromUrl, row.toUrl])),
    gone: new Set(gone.map((row) => row.url)),
    noindex: new Set(noindex.map((row) => row.url)),
    canonical: new Map(canonical.map((row) => [row.sourceUrl, row.targetUrl])),
  };
}

export async function getSeoRuleSets(): Promise<SeoRuleSets> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  if (!inFlight) {
    inFlight = load()
      .then((value) => {
        cache = { value, at: Date.now() };
        return value;
      })
      .finally(() => { inFlight = null; });
  }
  // A stale snapshot is fine to serve while the refresh is in flight.
  return cache?.value ?? inFlight;
}

export function bustSeoRulesCache() {
  cache = null;
}
