import assert from "node:assert/strict";
import test from "node:test";
import { mediaFileSlug } from "./filename";

const suffixed = (base: string, extension: string) => new RegExp(`^${base}-[0-9a-f]{8}\\${extension}$`);

test("keeps a Persian name readable in the key", () => {
  assert.match(mediaFileSlug("کفش چرم مردانه.jpg", ".jpg"), suffixed("کفش-چرم-مردانه", ".jpg"));
});

test("keeps a Latin name and collapses separators", () => {
  assert.match(mediaFileSlug("Leather   Backpack__A.png", ".png"), suffixed("Leather-Backpack__A", ".png"));
});

test("folds Arabic yeh and kaf so the same word gives the same key", () => {
  const arabic = mediaFileSlug("كيف.webp", ".webp");
  const persian = mediaFileSlug("کیف.webp", ".webp");
  assert.equal(arabic.replace(/-[0-9a-f]{8}\.webp$/, ""), persian.replace(/-[0-9a-f]{8}\.webp$/, ""));
});

test("falls back to a uuid when nothing usable survives", () => {
  assert.match(mediaFileSlug("!!! ???.jpg", ".jpg"), /^[0-9a-f-]{36}\.jpg$/);
  assert.match(mediaFileSlug(".jpg", ".jpg"), /^[0-9a-f-]{36}\.jpg$/);
});

test("trims a long name so the storage key stays inside its column", () => {
  const key = mediaFileSlug(`${"ب".repeat(200)}.jpg`, ".jpg");
  assert.ok(key.length <= 80, `expected a trimmed key, got ${key.length} characters`);
});

test("never leaves a separator hanging before the suffix", () => {
  assert.doesNotMatch(mediaFileSlug("عکس محصول -- .png", ".png"), /--[0-9a-f]{8}/);
});
