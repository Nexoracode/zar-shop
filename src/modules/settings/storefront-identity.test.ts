import assert from "node:assert/strict";
import test from "node:test";
import { generalSettingsFieldLimits } from "./settings-limits";
import { storefrontIdentityInputSchema } from "./storefront-identity";

const valid = { storeName: "زر گالری", tagline: "طلا، روایت ماندگار شما", mainLogoMediaId: null };

test("accepts a name, a tagline and no logo", () => {
  assert.equal(storefrontIdentityInputSchema.safeParse(valid).success, true);
});

test("trims the text and keeps the logo id", () => {
  const parsed = storefrontIdentityInputSchema.parse({ storeName: "  زر گالری ", tagline: " شعار ", mainLogoMediaId: "media-1" });
  assert.deepEqual(parsed, { storeName: "زر گالری", tagline: "شعار", mainLogoMediaId: "media-1" });
});

test("rejects a name or tagline that is too short or too long, with a Persian message", () => {
  const short = storefrontIdentityInputSchema.safeParse({ ...valid, storeName: "ز" });
  assert.equal(short.success, false);
  assert.match(short.error?.issues[0].message ?? "", /حداقل/);
  assert.equal(storefrontIdentityInputSchema.safeParse({ ...valid, storeName: "ز".repeat(generalSettingsFieldLimits.storeName + 1) }).success, false);
  assert.equal(storefrontIdentityInputSchema.safeParse({ ...valid, tagline: "ش".repeat(generalSettingsFieldLimits.tagline + 1) }).success, false);
});
