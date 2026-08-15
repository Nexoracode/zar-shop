import assert from "node:assert/strict";
import test from "node:test";

import { includesNormalizedText, normalizeSearchText } from "./text-search";

test("matches only options that contain the search query", () => {
  assert.equal(includesNormalizedText("آذربایجان شرقی", "شرقی"), true);
  assert.equal(includesNormalizedText("آذربایجان غربی", "شرقی"), false);
});

test("normalizes Arabic and Persian character variants", () => {
  assert.equal(includesNormalizedText("کهگیلویه و بویراحمد", "كهگيلويه"), true);
});

test("normalizes diacritics, joiners, and repeated whitespace", () => {
  assert.equal(normalizeSearchText("  شَرْق\u200Cی  "), "شرق ی");
  assert.equal(includesNormalizedText("شرق\u200Cی", "شرق ی"), true);
});
