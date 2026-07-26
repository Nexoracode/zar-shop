import type { GoldPriceQuote } from "@/modules/gold/gold-price.types";

const NAVASAN_ENDPOINT = "https://api.navasan.tech/latest/";

type NavasanResponse = {
  "18ayar"?: {
    value?: string | number;
    timestamp?: string | number;
  };
  message?: string;
};

export function parseNavasanGoldPrice(data: NavasanResponse): GoldPriceQuote {
  const item = data["18ayar"];
  const priceInToman = Number(String(item?.value ?? "").replace(/[^\d.]/g, ""));
  const timestamp = Number(item?.timestamp);

  if (!Number.isFinite(priceInToman) || !Number.isFinite(timestamp)) {
    throw new Error(`Navasan returned an invalid response${data.message ? `: ${data.message}` : ""}`);
  }

  return {
    pricePerGram18: Math.round(priceInToman * 10),
    source: "api.navasan.tech/18ayar",
    observedAt: new Date(timestamp * 1000),
  };
}

export async function fetchNavasanGoldPrice(apiKey: string, endpoint = NAVASAN_ENDPOINT) {
  const url = new URL(endpoint);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("item", "18ayar");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Navasan returned ${response.status}`);

  return parseNavasanGoldPrice(await response.json() as NavasanResponse);
}
