import assert from "node:assert/strict";
import test from "node:test";
import { parseProductPatch, productSchema } from "@/modules/products/schemas";

test("product patch keeps only explicitly submitted fields", () => {
  const patch = parseProductPatch({ options: [] });

  assert.deepEqual(patch, { options: [] });
  assert.equal("fixedPrice" in patch, false);
  assert.equal("mediaIds" in patch, false);
  assert.equal("optionGuideId" in patch, false);
  assert.equal("attributes" in patch, false);
});

test("product patch preserves explicit nullable and empty values", () => {
  const patch = parseProductPatch({ fixedPrice: null, mediaIds: [], optionGuideId: null });

  assert.deepEqual(patch, { fixedPrice: null, mediaIds: [], optionGuideId: null });
});

test("option groups default to SELECT type", () => {
  const result = productSchema.shape.options.safeParse([{ name: "سایز", values: [{ value: "بزرگ" }] }]);
  assert.equal(result.success, true);
  assert.equal(result.success && result.data[0].type, "SELECT");
});

test("COLOR-type option values must each have a colorId", () => {
  const result = productSchema.shape.options.safeParse([{ name: "انتخاب رنگ", type: "COLOR", values: [{ value: "قرمز" }] }]);
  assert.equal(result.success, false);
});

test("COLOR-type option accepts values that all carry a colorId", () => {
  const result = productSchema.shape.options.safeParse([{ name: "انتخاب رنگ", type: "COLOR", values: [{ value: "قرمز", colorId: "cabcdefghijklmnopqrstuvwxy" }] }]);
  assert.equal(result.success, true);
});
