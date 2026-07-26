import assert from "node:assert/strict";
import test from "node:test";
import { parseArzhaamGoldPrice } from "@/modules/gold/arzhaam-gold-price.provider";
import { loadFirstAvailableGoldPrice, safelyLoadGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { parseNavasanGoldPrice } from "@/modules/gold/navasan-gold-price.provider";

test("storefront gold price loader returns null when the provider fails", async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    const price = await safelyLoadGoldPriceForDisplay(async () => {
      throw new Error("provider unavailable");
    });

    assert.equal(price, null);
  } finally {
    console.error = originalConsoleError;
  }
});

test("gold price providers are tried sequentially", async () => {
  const calls: string[] = [];
  const originalConsoleWarn = console.warn;
  console.warn = () => undefined;

  try {
    const quote = await loadFirstAvailableGoldPrice([
      { name: "first", load: async () => { calls.push("first"); throw new Error("offline"); } },
      { name: "second", load: async () => { calls.push("second"); return { pricePerGram18: 186_000_000, source: "second" }; } },
      { name: "third", load: async () => { calls.push("third"); return { pricePerGram18: 187_000_000, source: "third" }; } },
    ]);

    assert.equal(quote.source, "second");
    assert.deepEqual(calls, ["first", "second"]);
  } finally {
    console.warn = originalConsoleWarn;
  }
});

test("Navasan toman response is normalized to IRR", () => {
  const quote = parseNavasanGoldPrice({
    "18ayar": { value: "18,650,000", timestamp: Math.floor(Date.now() / 1000) },
  });
  assert.equal(quote.pricePerGram18, 186_500_000);
});

test("Arzhaam stale responses are rejected", () => {
  assert.throws(() => parseArzhaamGoldPrice({
    rates: [{ assetId: "gold_18", price: 18_650_000, updatedAt: new Date().toISOString() }],
    meta: { currency: "toman", source: "stale" },
  }), /stale/);
});

test("Arzhaam live toman response is normalized to IRR", () => {
  const quote = parseArzhaamGoldPrice({
    rates: [{ assetId: "gold_18", price: 18_650_000, updatedAt: new Date().toISOString() }],
    meta: { currency: "toman", source: "live" },
  });
  assert.equal(quote.pricePerGram18, 186_500_000);
});
