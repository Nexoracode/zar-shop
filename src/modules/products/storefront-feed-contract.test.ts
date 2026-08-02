import assert from "node:assert/strict";
import test from "node:test";
import { storefrontProductFeedQuerySchema } from "./storefront-feed-contract";

test("storefront feed query applies safe defaults", () => {
  assert.deepEqual(storefrontProductFeedQuerySchema.parse({}), { sort: "LATEST", page: 1 });
});

test("storefront feed query accepts supported filters and coerces page", () => {
  assert.deepEqual(storefrontProductFeedQuerySchema.parse({ sort: "POPULAR", page: "3" }), { sort: "POPULAR", page: 3 });
  assert.throws(() => storefrontProductFeedQuerySchema.parse({ sort: "UNKNOWN", page: 1 }));
  assert.throws(() => storefrontProductFeedQuerySchema.parse({ sort: "LATEST", page: 0 }));
});
