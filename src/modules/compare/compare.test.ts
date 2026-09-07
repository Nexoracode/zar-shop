import assert from "node:assert/strict";
import test from "node:test";
import { COMPARE_MAX, canAddToCompare, readCompareStorage, type CompareItem } from "@/modules/compare/compare";

function item(id: string, categoryId: string | null = "cat-1"): CompareItem {
  return { id, slug: `p-${id}`, name: `کالای ${id}`, image: null, categoryId, categoryName: categoryId };
}

test("a product joins an empty list", () => {
  assert.deepEqual(canAddToCompare([], item("a")), { ok: true });
});

test("a product already in the list is rejected as a duplicate", () => {
  assert.deepEqual(canAddToCompare([item("a")], item("a")), { ok: false, reason: "duplicate" });
});

test("a product from another category is rejected", () => {
  assert.deepEqual(canAddToCompare([item("a", "cat-1")], item("b", "cat-2")), { ok: false, reason: "category" });
});

test("same-category products are allowed up to the cap", () => {
  const list = Array.from({ length: COMPARE_MAX }, (_, index) => item(`p${index}`));
  assert.deepEqual(canAddToCompare(list.slice(0, -1), list.at(-1)!), { ok: true });
  assert.deepEqual(canAddToCompare(list, item("one-more")), { ok: false, reason: "full" });
});

test("a product with no category can only ever sit alone", () => {
  assert.deepEqual(canAddToCompare([], item("a", null)), { ok: true });
  assert.deepEqual(canAddToCompare([item("a", null)], item("b", null)), { ok: false, reason: "category" });
});

test("storage reader drops malformed entries and caps the list", () => {
  assert.deepEqual(readCompareStorage(null), []);
  assert.deepEqual(readCompareStorage("not json"), []);
  const raw = JSON.stringify([
    { id: "a", slug: "p-a", name: "A", image: null, categoryId: "c", categoryName: "c" },
    { id: "b", slug: "p-b" },
    { nope: true },
  ]);
  assert.deepEqual(readCompareStorage(raw).map((entry) => entry.id), ["a"]);
});
