import assert from "node:assert/strict";
import test from "node:test";
import { categoryStripDisplayConfig, isCategoryStripId, newCategoryStripId, newCategoryStripSettings, resolveCategoryStrips } from "./category-strips";
import { categoriesSectionDefaults } from "./section-settings";

test("strip ids have their own prefix", () => {
  assert.equal(isCategoryStripId(newCategoryStripId("2f4c-9a")), true);
  assert.equal(isCategoryStripId("CATEGORIES"), false);
  assert.equal(isCategoryStripId("CATEGORY_STRIP:"), false);
  assert.equal(isCategoryStripId("CATEGORY_STRIP:a:b"), false);
});

test("a new strip starts from the fixed strip's defaults", () => {
  assert.deepEqual(newCategoryStripSettings(), categoriesSectionDefaults);
});

test("reads the stored strips and ignores malformed ones", () => {
  const stored = {
    CATEGORY_STRIPS: {
      "CATEGORY_STRIP:a": { title: "دسته‌ها", description: "", limit: 6, sort: "NAME" },
      "CATEGORY_STRIP:b": { title: "د", description: "", limit: 6, sort: "NAME" },
      "PRODUCT_LIST:c": { title: "دسته‌ها", description: "", limit: 6, sort: "NAME" },
    },
  };
  assert.deepEqual(Object.keys(resolveCategoryStrips(stored)), ["CATEGORY_STRIP:a"]);
  assert.deepEqual(resolveCategoryStrips(null), {});
});

test("a strip has the fixed strip's switches in the general template only", () => {
  assert.ok((categoryStripDisplayConfig("GENERAL")?.parts.length ?? 0) > 0);
  assert.equal(categoryStripDisplayConfig("GOLD")?.parts.length, 0);
});
