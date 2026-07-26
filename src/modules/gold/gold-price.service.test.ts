import assert from "node:assert/strict";
import test from "node:test";
import { safelyLoadGoldPriceForDisplay } from "@/modules/gold/gold-price.service";

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
