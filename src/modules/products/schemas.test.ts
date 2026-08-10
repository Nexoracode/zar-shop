import assert from "node:assert/strict";
import test from "node:test";
import { parseProductPatch } from "@/modules/products/schemas";

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
