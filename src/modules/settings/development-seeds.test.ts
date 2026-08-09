import assert from "node:assert/strict";
import test from "node:test";
import { generalStoreSeed } from "../../../prisma/seeds/general.seed";
import { goldStoreSeed } from "../../../prisma/seeds/gold.seed";
import { validateProductAttributes } from "@/modules/products/attributes";

for (const seed of [goldStoreSeed, generalStoreSeed]) {
  test(`${seed.industry} development seed contains one complete isolated catalog`, () => {
    assert.equal(seed.categories.length, 5);
    assert.equal(seed.products.length, 12);
    assert.equal(new Set(seed.categories.map((category) => category.slug)).size, seed.categories.length);
    assert.equal(new Set(seed.products.map((product) => product.sku)).size, seed.products.length);
    assert.equal(new Set(seed.products.map((product) => product.slug)).size, seed.products.length);
    const categorySlugs = new Set(seed.categories.map((category) => category.slug));
    assert.equal(seed.products.every((product) => categorySlugs.has(product.categorySlug)), true);
    assert.equal(seed.products.every((product) => seed.industry === "GOLD" ? Boolean(product.weightGrams) && !product.fixedPrice : Boolean(product.fixedPrice) && !product.weightGrams), true);
    assert.equal(seed.products.every((product) => validateProductAttributes(seed.categories.find((category) => category.slug === product.categorySlug)?.attributeSchema ?? [], product.attributes ?? []).ok), true);
  });
}
