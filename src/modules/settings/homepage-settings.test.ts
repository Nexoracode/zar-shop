import assert from "node:assert/strict";
import test from "node:test";
import { homepageSettingsDefaults, homepageSettingsInputSchema } from "./homepage-settings";

test("homepage settings accept a complete reordered section list", () => {
  const parsed = homepageSettingsInputSchema.parse({
    ...homepageSettingsDefaults,
    sections: [...homepageSettingsDefaults.sections].reverse(),
  });
  assert.equal(parsed.sections[0].id, "CONCIERGE");
});

test("homepage settings reject duplicated sections", () => {
  const sections = homepageSettingsDefaults.sections.map((section) => ({ ...section }));
  sections[1].id = sections[0].id;
  assert.equal(homepageSettingsInputSchema.safeParse({ ...homepageSettingsDefaults, sections }).success, false);
});

test("homepage settings reject unsafe action links", () => {
  assert.equal(homepageSettingsInputSchema.safeParse({ ...homepageSettingsDefaults, heroButtonHref: "javascript:alert(1)" }).success, false);
});

test("homepage settings accept an image-only clickable hero", () => {
  const parsed = homepageSettingsInputSchema.parse({ ...homepageSettingsDefaults, heroContentMode: "IMAGE_ONLY", heroButtonHref: "/campaign/summer" });
  assert.equal(parsed.heroContentMode, "IMAGE_ONLY");
});

test("homepage settings normalize an empty promo link", () => {
  const parsed = homepageSettingsInputSchema.parse({ ...homepageSettingsDefaults, promoBannerEnabled: true, promoBannerHref: "" });
  assert.equal(parsed.promoBannerHref, null);
});
