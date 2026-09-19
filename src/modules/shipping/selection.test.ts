import assert from "node:assert/strict";
import test from "node:test";
import { pickCheapestOption } from "@/modules/shipping/selection";

test("picks the cheapest priced option", () => {
  const options = [{ id: "a", price: 90_000 }, { id: "b", price: 40_000 }, { id: "c", price: 70_000 }];
  assert.equal(pickCheapestOption(options)?.id, "b");
});

test("keeps the admin's order when prices tie", () => {
  const options = [{ id: "first", price: 50_000 }, { id: "second", price: 50_000 }];
  assert.equal(pickCheapestOption(options)?.id, "first");
});

test("returns null when nothing can be priced", () => {
  assert.equal(pickCheapestOption([]), null);
});
