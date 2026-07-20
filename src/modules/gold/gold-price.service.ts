import { db } from "@/lib/db";
import { env } from "@/lib/env";

const MAX_AGE_MS = 2 * 60 * 1000;

async function fetchProviderPrice() {
  if (env.GOLD_PRICE_PROVIDER === "mock") {
    return { pricePerGram18: 48_500_000, source: "mock" };
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
  if (!options?.force && cached && Date.now() - cached.fetchedAt.getTime() < MAX_AGE_MS) return cached;
  try {
    const fresh = await fetchProviderPrice();
    return await db.goldPrice.create({ data: { ...fresh, fetchedAt: new Date() } });
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}
