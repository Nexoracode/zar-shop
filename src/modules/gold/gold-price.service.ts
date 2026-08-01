import { unstable_rethrow } from "next/navigation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { fetchArzhaamGoldPrice } from "@/modules/gold/arzhaam-gold-price.provider";
import type { GoldPriceProvider, GoldPriceQuote } from "@/modules/gold/gold-price.types";
import { validateGoldPriceQuote } from "@/modules/gold/gold-price.types";
import { fetchNavasanGoldPrice } from "@/modules/gold/navasan-gold-price.provider";
import { fetchTgjuGoldPrice } from "@/modules/gold/tgju-gold-price.provider";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";

const MAX_SOURCE_AGE_MS = env.GOLD_PRICE_MAX_SOURCE_AGE_MINUTES * 60 * 1000;

async function fetchHttpProvider(): Promise<GoldPriceQuote> {
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

export async function loadFirstAvailableGoldPrice(
  providers: GoldPriceProvider[],
  maxSourceAgeMs = MAX_SOURCE_AGE_MS,
) {
  const errors: Error[] = [];

  for (const provider of providers) {
    try {
      return validateGoldPriceQuote(await provider.load(), maxSourceAgeMs);
    } catch (error) {
      // Next.js uses internal exceptions to opt routes into dynamic rendering.
      // They must never be treated as provider failures or wrapped in AggregateError.
      unstable_rethrow(error);
      const normalized = error instanceof Error ? error : new Error(String(error));
      errors.push(new Error(`${provider.name}: ${normalized.message}`));
      console.warn(`[gold-price] ${provider.name} failed; trying the next provider.`, normalized.message);
    }
  }

  throw new AggregateError(errors, "All configured gold price providers failed");
}

function getProviderChain(): GoldPriceProvider[] {
  if (env.GOLD_PRICE_PROVIDER === "mock") {
    return [{ name: "mock", load: async () => ({ pricePerGram18: 48_500_000, source: "mock" }) }];
  }

  const providers: GoldPriceProvider[] = [];
  if (env.GOLD_PRICE_PROVIDER === "http") {
    providers.push({ name: "custom-http", load: fetchHttpProvider });
  }

  providers.push({
    name: "tgju",
    load: () => fetchTgjuGoldPrice(env.GOLD_PRICE_PROVIDER === "tgju" && env.GOLD_PRICE_ENDPOINT ? env.GOLD_PRICE_ENDPOINT : undefined),
  });

  if (env.NAVASAN_API_KEY) {
    providers.push({
      name: "navasan",
      load: () => fetchNavasanGoldPrice(env.NAVASAN_API_KEY, env.NAVASAN_API_ENDPOINT || undefined),
    });
  }

  if (env.ARZHAAM_API_KEY) {
    providers.push({
      name: "arzhaam",
      load: () => fetchArzhaamGoldPrice(env.ARZHAAM_API_KEY, env.ARZHAAM_API_ENDPOINT || undefined),
    });
  }

  return providers;
}

async function fetchProviderPrice() {
  return loadFirstAvailableGoldPrice(getProviderChain());
}

export async function getGoldPrice(options?: { force?: boolean }) {
  const settings = await getCatalogSettings();
  const maxAgeMs = settings.goldPriceCacheSeconds * 1000;
  const fallbackMaxAgeMs = settings.goldPriceFallbackMinutes * 60_000;
  const cached = await db.goldPrice.findFirst({ orderBy: { fetchedAt: "desc" } });
  const cacheAge = cached ? Date.now() - cached.fetchedAt.getTime() : Number.POSITIVE_INFINITY;
  const cachedIsReal = cached && !["mock", "seed"].includes(cached.source);

  if (!options?.force && cached && cacheAge < maxAgeMs && (env.GOLD_PRICE_PROVIDER === "mock" || cachedIsReal)) {
    return cached;
  }
  try {
    const fresh = await fetchProviderPrice();
    return await db.goldPrice.create({
      data: { pricePerGram18: fresh.pricePerGram18, source: fresh.source, fetchedAt: new Date() },
    });
  } catch (error) {
    if (cached && cachedIsReal && cacheAge <= fallbackMaxAgeMs) {
      console.warn("[gold-price] Providers failed; using the most recent controlled fallback rate.");
      return cached;
    }
    throw error;
  }
}

type GoldPrice = Awaited<ReturnType<typeof getGoldPrice>>;

export async function safelyLoadGoldPriceForDisplay(
  loadPrice: () => Promise<GoldPrice>,
): Promise<GoldPrice | null> {
  try {
    return await loadPrice();
  } catch (error) {
    unstable_rethrow(error);
    console.error("[gold-price] Price is unavailable for storefront display.", error);
    return null;
  }
}

export function getGoldPriceForDisplay() {
  return safelyLoadGoldPriceForDisplay(() => getGoldPrice());
}
