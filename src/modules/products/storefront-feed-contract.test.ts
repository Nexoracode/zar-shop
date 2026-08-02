import assert from "node:assert/strict";
import test from "node:test";
import { storefrontPaginationWindow, storefrontProductFeedQuerySchema } from "./storefront-feed-contract";

test("storefront feed query applies safe defaults", () => {
  assert.deepEqual(storefrontProductFeedQuerySchema.parse({}), { sort: "LATEST", page: 1 });
});

test("storefront feed query accepts supported filters and coerces page", () => {
  assert.deepEqual(storefrontProductFeedQuerySchema.parse({ sort: "POPULAR", page: "3" }), { sort: "POPULAR", page: 3 });
  assert.throws(() => storefrontProductFeedQuerySchema.parse({ sort: "UNKNOWN", page: 1 }));
  assert.throws(() => storefrontProductFeedQuerySchema.parse({ sort: "LATEST", page: 0 }));
});

test("pagination window stays compact", () => {
  assert.deepEqual(storefrontPaginationWindow(1, 3), [1, 2, 3]);
  assert.deepEqual(storefrontPaginationWindow(5, 10), [1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  assert.deepEqual(storefrontPaginationWindow(9, 10), [1, "ellipsis", 7, 8, 9, 10]);
});
