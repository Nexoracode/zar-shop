const DEFAULT_TGJU_ENDPOINT = "https://www.tgju.org/profile/geram18";

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)));
}

export function parseTgjuGoldPrice(html: string) {
  const match = html.match(
    /data-col=["']info\.last_trade\.PDrCotVal["'][^>]*>\s*([\d,۰-۹٠-٩]+)\s*</i,
  );
  const price = Number(normalizeDigits(match?.[1] ?? "").replace(/[^\d]/g, ""));

  // Guard against silently accepting a changed page structure or another market value.
  if (!Number.isSafeInteger(price) || price < 1_000_000 || price > 10_000_000_000) {
    throw new Error("TGJU returned an invalid 18k gold price");
  }

  return price;
}

export async function fetchTgjuGoldPrice(endpoint = DEFAULT_TGJU_ENDPOINT) {
  const response = await fetch(endpoint, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "ZarStore/1.0 (+gold-price-loader)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) throw new Error(`TGJU returned ${response.status}`);

  return {
    pricePerGram18: parseTgjuGoldPrice(await response.text()),
    source: "tgju.org/geram18",
  };
}
