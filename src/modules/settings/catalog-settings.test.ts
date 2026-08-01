import assert from "node:assert/strict";
import test from "node:test";
import { parseCatalogSettingsUpdate } from "@/modules/settings/catalog-settings";

const common = {
  catalogLowStockThreshold: 4,
  catalogPageSize: 20,
  hideOutOfStockProducts: true,
  showProductStock: false,
};

test("regular product settings never accept gold controls or an industry change", () => {
  const settings = parseCatalogSettingsUpdate("GENERAL", {
    ...common,
    industry: "GOLD",
    goldPriceRefreshSeconds: 15,
  });
  assert.deepEqual(settings, common);
});

test("gold catalog settings require safe refresh, cache and fallback limits", () => {
  assert.throws(() => parseCatalogSettingsUpdate("GOLD", {
    ...common,
    goldPriceRefreshSeconds: 5,
    goldPriceCacheSeconds: 120,
    goldPriceFallbackMinutes: 15,
  }));
  assert.deepEqual(parseCatalogSettingsUpdate("GOLD", {
    ...common,
    goldPriceRefreshSeconds: 60,
    goldPriceCacheSeconds: 120,
    goldPriceFallbackMinutes: 15,
  }), {
    ...common,
    goldPriceRefreshSeconds: 60,
    goldPriceCacheSeconds: 120,
    goldPriceFallbackMinutes: 15,
  });
});
