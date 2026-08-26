import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCombinations,
  describeSelection,
  findVariant,
  isVariantAvailable,
  mergeCombinations,
  selectionSignature,
  variantSelectionKey,
  type VariantDraft,
} from "@/modules/products/variants";

const colourAndSize = [
  { typeName: "رنگ", values: ["مشکی", "زرد"] },
  { typeName: "سایز", values: ["XL"] },
];

test("one type gives one row per value", () => {
  const rows = buildCombinations([{ typeName: "سایز", values: ["M", "L", "XL"] }]);
  assert.deepEqual(rows, [{ سایز: "M" }, { سایز: "L" }, { سایز: "XL" }]);
});

test("two types pair every value with every other", () => {
  assert.deepEqual(buildCombinations(colourAndSize), [
    { رنگ: "مشکی", سایز: "XL" },
    { رنگ: "زرد", سایز: "XL" },
  ]);
});

test("three types multiply out", () => {
  const rows = buildCombinations([
    { typeName: "رنگ", values: ["مشکی", "زرد"] },
    { typeName: "سایز", values: ["M", "L"] },
    { typeName: "جنس", values: ["نخ"] },
  ]);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], { رنگ: "مشکی", سایز: "M", جنس: "نخ" });
});

test("a type with no values yet means nothing is buyable", () => {
  assert.deepEqual(buildCombinations([{ typeName: "رنگ", values: ["مشکی"] }, { typeName: "سایز", values: [] }]), []);
  assert.deepEqual(buildCombinations([]), []);
});

test("the key does not depend on the order the types were added", () => {
  assert.equal(
    variantSelectionKey({ رنگ: "مشکی", سایز: "XL" }),
    variantSelectionKey({ سایز: "XL", رنگ: "مشکی" }),
  );
});

test("different pairings get different keys", () => {
  assert.notEqual(variantSelectionKey({ رنگ: "مشکی" }), variantSelectionKey({ رنگ: "زرد" }));
});

test("merging keeps what was already filled in", () => {
  const first = mergeCombinations([], colourAndSize);
  const priced = first.map((variant) => ({ ...variant, price: "500000", stock: 4 }));

  // A third colour arrives; the two already priced must keep their figures.
  const next = mergeCombinations(priced, [
    { typeName: "رنگ", values: ["مشکی", "زرد", "سفید"] },
    { typeName: "سایز", values: ["XL"] },
  ]);
  assert.equal(next.length, 3);
  assert.equal(next.filter((variant) => variant.price === "500000").length, 2);
  const fresh = next.find((variant) => variant.selection["رنگ"] === "سفید");
  assert.equal(fresh?.price, null);
  assert.equal(fresh?.stock, 0);
});

test("removing a value takes only its own rows", () => {
  const priced = mergeCombinations([], colourAndSize).map((variant) => ({ ...variant, stock: 7 }));
  const next = mergeCombinations(priced, [
    { typeName: "رنگ", values: ["مشکی"] },
    { typeName: "سایز", values: ["XL"] },
  ]);
  assert.equal(next.length, 1);
  assert.equal(next[0].selection["رنگ"], "مشکی");
  assert.equal(next[0].stock, 7);
});

test("merging is capped so a form cannot be flooded", () => {
  const many = mergeCombinations([], [
    { typeName: "الف", values: Array.from({ length: 20 }, (_, index) => `a${index}`) },
    { typeName: "ب", values: Array.from({ length: 20 }, (_, index) => `b${index}`) },
  ]);
  assert.equal(many.length, 100);
});

test("a combination reads in the order its types are given", () => {
  assert.equal(describeSelection({ سایز: "XL", رنگ: "مشکی" }, ["رنگ", "سایز"]), "مشکی - XL");
});

test("availability needs both an active row and the stock for it", () => {
  assert.equal(isVariantAvailable({ isActive: true, stock: 3 }, 2), true);
  assert.equal(isVariantAvailable({ isActive: true, stock: 1 }, 2), false);
  assert.equal(isVariantAvailable({ isActive: false, stock: 9 }, 1), false);
});

test("a cart line finds its combination by key, or nothing", () => {
  const variants: VariantDraft[] = mergeCombinations([], colourAndSize);
  const stored = variants.map((variant) => ({ ...variant, selectionKey: variantSelectionKey(variant.selection) }));
  assert.equal(findVariant(stored, stored[1].selectionKey)?.selection["رنگ"], "زرد");
  assert.equal(findVariant(stored, "missing"), null);
});

test("the form's signature and the stored key agree on what is the same combination", () => {
  assert.equal(selectionSignature({ رنگ: "مشکی", سایز: "XL" }), selectionSignature({ سایز: "XL", رنگ: "مشکی" }));
  assert.notEqual(selectionSignature({ رنگ: "مشکی" }), selectionSignature({ رنگ: "زرد" }));
});
