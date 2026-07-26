export type GoldPriceQuote = {
  pricePerGram18: number;
  source: string;
  observedAt?: Date;
};

export type GoldPriceProvider = {
  name: string;
  load: () => Promise<GoldPriceQuote>;
};

export function validateGoldPriceQuote(quote: GoldPriceQuote, maxSourceAgeMs: number) {
  if (!Number.isSafeInteger(quote.pricePerGram18) || quote.pricePerGram18 < 1_000_000 || quote.pricePerGram18 > 10_000_000_000) {
    throw new Error(`${quote.source} returned an invalid 18k gold price`);
  }

  if (!quote.observedAt) return quote;

  const observedAt = quote.observedAt.getTime();
  const age = Date.now() - observedAt;
  if (!Number.isFinite(observedAt) || age < -5 * 60 * 1000 || age > maxSourceAgeMs) {
    throw new Error(`${quote.source} returned a stale gold price`);
  }

  return quote;
}
