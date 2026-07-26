import assert from "node:assert/strict";
import test from "node:test";
import { buildCategoryTree, collectCategoryAndDescendantIds, wouldCreateCategoryCycle } from "@/modules/categories/category-tree";

const categories = [
  { id: "women", parentId: null, name: "زنانه" },
  { id: "rings", parentId: "women", name: "انگشتر" },
  { id: "minimal", parentId: "rings", name: "مینیمال" },
  { id: "men", parentId: null, name: "مردانه" },
];

test("buildCategoryTree creates nested children", () => {
  const tree = buildCategoryTree(categories);
  assert.equal(tree.length, 2);
  assert.equal(tree[0].children[0].id, "rings");
  assert.equal(tree[0].children[0].children[0].id, "minimal");
});

test("collectCategoryAndDescendantIds includes all nested levels", () => {
  assert.deepEqual(collectCategoryAndDescendantIds("women", categories).sort(), ["minimal", "rings", "women"]);
});

test("wouldCreateCategoryCycle rejects moving a parent below its descendant", () => {
  assert.equal(wouldCreateCategoryCycle("women", "minimal", categories), true);
  assert.equal(wouldCreateCategoryCycle("rings", "men", categories), false);
});
