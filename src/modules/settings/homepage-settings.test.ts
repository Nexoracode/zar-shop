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

test("homepage settings accept unique menu categories", () => {
  const parsed = homepageSettingsInputSchema.parse({ ...homepageSettingsDefaults, menuCategoryIds: ["category-1", "category-2"] });
  assert.deepEqual(parsed.menuCategoryIds, ["category-1", "category-2"]);
});

test("homepage settings reject duplicate or excessive menu categories", () => {
  assert.equal(homepageSettingsInputSchema.safeParse({ ...homepageSettingsDefaults, menuCategoryIds: ["same", "same"] }).success, false);
  assert.equal(homepageSettingsInputSchema.safeParse({ ...homepageSettingsDefaults, menuCategoryIds: Array.from({ length: 7 }, (_, index) => `category-${index}`) }).success, false);
});

test("homepage settings accept one optional image per treasure card", () => {
  const treasureCards = homepageSettingsDefaults.treasureCards.map((card, index) => ({ ...card, mediaId: index === 0 ? "media-1" : null }));
  const parsed = homepageSettingsInputSchema.parse({ ...homepageSettingsDefaults, treasureCards });
  assert.equal(parsed.treasureCards[0].mediaId, "media-1");
});

test("homepage settings reject duplicate treasure card identifiers", () => {
  const treasureCards = homepageSettingsDefaults.treasureCards.map((card) => ({ ...card }));
  treasureCards[1].id = treasureCards[0].id;
  assert.equal(homepageSettingsInputSchema.safeParse({ ...homepageSettingsDefaults, treasureCards }).success, false);
});

test("homepage settings accept multiple hero image pairs", () => {
  const heroSlides = [
    { id: "slide-1", desktopMediaId: "desktop-1", mobileMediaId: "mobile-1" },
    { id: "slide-2", desktopMediaId: "desktop-2", mobileMediaId: null },
  ];
  const parsed = homepageSettingsInputSchema.parse({ ...homepageSettingsDefaults, heroSlides });
  assert.equal(parsed.heroSlides.length, 2);
});

test("homepage settings reject duplicate hero slide identifiers", () => {
  const heroSlides = [
    { id: "same", desktopMediaId: "desktop-1", mobileMediaId: null },
    { id: "same", desktopMediaId: "desktop-2", mobileMediaId: null },
  ];
  assert.equal(homepageSettingsInputSchema.safeParse({ ...homepageSettingsDefaults, heroSlides }).success, false);
});
