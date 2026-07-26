import type { GoldPriceQuote } from "@/modules/gold/gold-price.types";

const ARZHAAM_ENDPOINT = "https://arzhaam.ir/api/rates/latest";

type ArzhaamResponse = {
  rates?: Array<{ assetId?: string; price?: number; updatedAt?: string }>;
  meta?: { currency?: string; source?: string };
};

export function parseArzhaamGoldPrice(data: ArzhaamResponse): GoldPriceQuote {
  if (data.meta?.currency !== "toman" || data.meta?.source !== "live") {
    throw new Error("Arzhaam returned a stale response or an unexpected currency");
  }

  const item = data.rates?.find((rate) => rate.assetId === "gold_18");
  const priceInToman = Number(item?.price);
  const observedAt = new Date(item?.updatedAt ?? "");
  if (!Number.isFinite(priceInToman) || Number.isNaN(observedAt.getTime())) {
    throw new Error("Arzhaam returned an invalid gold_18 response");
  }

  return {
    pricePerGram18: Math.round(priceInToman * 10),
    source: "arzhaam.ir/gold_18",
    observedAt,
  };
}

export async function fetchArzhaamGoldPrice(apiKey: string, endpoint = ARZHAAM_ENDPOINT) {
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json", "X-App-Key": apiKey },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Arzhaam returned ${response.status}`);

  return parseArzhaamGoldPrice(await response.json() as ArzhaamResponse);
}
