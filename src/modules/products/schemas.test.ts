import assert from "node:assert/strict";
import test from "node:test";
import { parseProductPatch, productSchema } from "@/modules/products/schemas";

test("product patch keeps only explicitly submitted fields", () => {
  const patch = parseProductPatch({ variants: [] });

  assert.deepEqual(patch, { variants: [] });
  assert.equal("fixedPrice" in patch, false);
  assert.equal("mediaIds" in patch, false);
  assert.equal("optionGuideId" in patch, false);
  assert.equal("attributes" in patch, false);
});

test("product patch preserves explicit nullable and empty values", () => {
  const patch = parseProductPatch({ fixedPrice: null, mediaIds: [], optionGuideId: null });

  assert.deepEqual(patch, { fixedPrice: null, mediaIds: [], optionGuideId: null });
});

test("a chosen type must bring at least one value", () => {
  const id = "cabcdefghijklmnopqrstuvwxy";
  assert.equal(productSchema.shape.optionTypes.safeParse([{ typeId: id, valueIds: [] }]).success, false);
  assert.equal(productSchema.shape.optionTypes.safeParse([{ typeId: id, valueIds: [id] }]).success, true);
});

test("a combination defaults to active with no stock", () => {
  const result = productSchema.shape.variants.safeParse([{ selection: { "رنگ": "مشکی" } }]);
  assert.equal(result.success, true);
  assert.equal(result.success && result.data[0].isActive, true);
  assert.equal(result.success && result.data[0].stock, 0);
});

test("the same combination cannot be listed twice", () => {
  const result = productSchema.shape.variants.safeParse([
    { selection: { "رنگ": "مشکی", "سایز": "XL" } },
    { selection: { "سایز": "XL", "رنگ": "مشکی" } },
  ]);
  assert.equal(result.success, false);
});

test("a combination's discount needs its type, amount and window together", () => {
  const window = { discountStartsAt: "2026-01-01", discountEndsAt: "2026-01-10" };
  assert.equal(productSchema.shape.variants.safeParse([{ selection: { "رنگ": "مشکی" }, discountType: "PERCENT" }]).success, false);
  assert.equal(productSchema.shape.variants.safeParse([{ selection: { "رنگ": "مشکی" }, discountType: "PERCENT", discountValue: "20" }]).success, false);
  assert.equal(productSchema.shape.variants.safeParse([{ selection: { "رنگ": "مشکی" }, discountType: "PERCENT", discountValue: "20", ...window }]).success, true);
  assert.equal(productSchema.shape.variants.safeParse([{ selection: { "رنگ": "مشکی" }, discountType: "PERCENT", discountValue: "120", ...window }]).success, false);
  assert.equal(productSchema.shape.variants.safeParse([{ selection: { "رنگ": "مشکی" }, discountType: "PERCENT", discountValue: "20", discountStartsAt: "2026-01-10", discountEndsAt: "2026-01-01" }]).success, false);
});
