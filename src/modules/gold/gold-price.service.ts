import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { fetchTgjuGoldPrice } from "@/modules/gold/tgju-gold-price.provider";

const MAX_AGE_MS = 2 * 60 * 1000;
const MAX_STALE_AGE_MS = 24 * 60 * 60 * 1000;

async function fetchProviderPrice() {
  if (env.GOLD_PRICE_PROVIDER === "mock") {
    return { pricePerGram18: 48_500_000, source: "mock" };
  }
  if (env.GOLD_PRICE_PROVIDER === "tgju") {
    return fetchTgjuGoldPrice(env.GOLD_PRICE_ENDPOINT || undefined);
  }
  if (!env.GOLD_PRICE_ENDPOINT) throw new Error("GOLD_PRICE_ENDPOINT is required");
  const response = await fetch(env.GOLD_PRICE_ENDPOINT, {
    headers: env.GOLD_PRICE_API_KEY ? { Authorization: `Bearer ${env.GOLD_PRICE_API_KEY}` } : {},
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Gold price provider returned ${response.status}`);
  const data = (await response.json()) as { pricePerGram18?: number };
  if (!data.pricePerGram18 || data.pricePerGram18 <= 0) throw new Error("Invalid gold price response");
  return { pricePerGram18: Math.round(data.pricePerGram18), source: "http-provider" };
}

export async function getGoldPrice(options?: { force?: boolean }) {
  const cached = await db.goldPrice.findFirst({ orderBy: { fetchedAt: "desc" } });
  const cacheAge = cached ? Date.now() - cached.fetchedAt.getTime() : Number.POSITIVE_INFINITY;
  const cachedIsReal = cached && !["mock", "seed"].includes(cached.source);

  if (!options?.force && cached && cacheAge < MAX_AGE_MS && (env.GOLD_PRICE_PROVIDER === "mock" || cachedIsReal)) {
    return cached;
  }
  try {
    const fresh = await fetchProviderPrice();
    return await db.goldPrice.create({ data: { ...fresh, fetchedAt: new Date() } });
  } catch (error) {
    if (cachedIsReal && cacheAge < MAX_STALE_AGE_MS) return cached;
    throw error;
  }
}
