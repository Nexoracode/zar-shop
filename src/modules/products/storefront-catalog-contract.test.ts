import assert from "node:assert/strict";
import test from "node:test";
import { matchesTomanPrice, storefrontCatalogQuerySchema } from "./storefront-catalog-contract";

test("catalog query accepts Remas-style price parameters", () => {
  const query = storefrontCatalogQuerySchema.parse({ sortby: "newest", MinPrice: "100000000", page: "2" });
  assert.deepEqual(query, { sortby: "newest", MinPrice: 100_000_000, page: 2 });
});

test("catalog query accepts and trims a storefront search", () => {
  const query = storefrontCatalogQuerySchema.parse({ q: "  انگشتر طلا  " });
  assert.equal(query.q, "انگشتر طلا");
});

test("catalog query rejects an inverted price range", () => {
  assert.equal(storefrontCatalogQuerySchema.safeParse({ MinPrice: 100, MaxPrice: 50 }).success, false);
});

test("catalog price matching interprets URL bounds as toman", () => {
  assert.equal(matchesTomanPrice(1_000_000_000, 100_000_000), true);
  assert.equal(matchesTomanPrice(999_999_990, 100_000_000), false);
  assert.equal(matchesTomanPrice(null, 100_000_000), false);
});
