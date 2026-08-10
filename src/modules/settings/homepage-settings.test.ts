import assert from "node:assert/strict";
import test from "node:test";
import { generalHomepageSettingsDefaults, homepageHeroSettingsInputSchema, homepageLayoutSettingsInputSchema, homepageOverviewSettingsInputSchema, homepageSettingsDefaults, homepageSettingsInputSchema, homepageTilesSettingsInputSchema } from "./homepage-settings";

test("general storefront starts with copy independent from the gold template", () => {
  assert.notEqual(generalHomepageSettingsDefaults.heroTitle, homepageSettingsDefaults.heroTitle);
  assert.equal(homepageSettingsInputSchema.safeParse(generalHomepageSettingsDefaults).success, true);
});

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

test("homepage settings accept independent menu items", () => {
  const menuItems = [{ id: "special", label: "پیشنهاد ویژه", href: "/products?featured=true" }];
  const parsed = homepageSettingsInputSchema.parse({ ...homepageSettingsDefaults, menuItems });
  assert.deepEqual(parsed.menuItems, menuItems);
});

test("homepage settings reject unsafe, duplicate or excessive menu items", () => {
  const item = { id: "same", label: "آیتم", href: "/products" };
  assert.equal(homepageSettingsInputSchema.safeParse({ ...homepageSettingsDefaults, menuItems: [item, item] }).success, false);
  assert.equal(homepageSettingsInputSchema.safeParse({ ...homepageSettingsDefaults, menuItems: [{ ...item, href: "javascript:alert(1)" }] }).success, false);
  assert.equal(homepageSettingsInputSchema.safeParse({ ...homepageSettingsDefaults, menuItems: Array.from({ length: 21 }, (_, index) => ({ id: `item-${index}`, label: `آیتم ${index}`, href: "/products" })) }).success, false);
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

test("homepage settings accept license images and optional safe links", () => {
  const licenses = homepageSettingsDefaults.licenses.map((license, index) => ({
    ...license,
    mediaId: `license-media-${index + 1}`,
    href: index === 0 ? "/pages/licenses" : index === 1 ? "https://example.com/license" : "",
  }));
  const parsed = homepageOverviewSettingsInputSchema.parse({ ...homepageSettingsDefaults, licenses });
  assert.equal(parsed.licenses[0].mediaId, "license-media-1");
  assert.equal(parsed.licenses[1].href, "https://example.com/license");
  assert.equal(parsed.licenses[2].href, null);
});

test("homepage settings reject duplicate licenses and unsafe license links", () => {
  const duplicated = homepageSettingsDefaults.licenses.map((license) => ({ ...license }));
  duplicated[1].id = duplicated[0].id;
  assert.equal(homepageOverviewSettingsInputSchema.safeParse({ ...homepageSettingsDefaults, licenses: duplicated }).success, false);
  const unsafe = homepageSettingsDefaults.licenses.map((license, index) => ({ ...license, href: index === 0 ? "javascript:alert(1)" : null }));
  assert.equal(homepageOverviewSettingsInputSchema.safeParse({ ...homepageSettingsDefaults, licenses: unsafe }).success, false);
});

test("homepage settings accept multiple hero image pairs", () => {
  const heroSlides = [
    { id: "slide-1", desktopMediaId: "desktop-1", mobileMediaId: "mobile-1", href: "/products/one" },
    { id: "slide-2", desktopMediaId: "desktop-2", mobileMediaId: null, href: "https://example.com/campaign" },
  ];
  const parsed = homepageSettingsInputSchema.parse({ ...homepageSettingsDefaults, heroSlides });
  assert.equal(parsed.heroSlides.length, 2);
  assert.equal(parsed.heroSlides[1].href, "https://example.com/campaign");
});

test("homepage settings reject duplicate hero slide identifiers", () => {
  const heroSlides = [
    { id: "same", desktopMediaId: "desktop-1", mobileMediaId: null, href: "/one" },
    { id: "same", desktopMediaId: "desktop-2", mobileMediaId: null, href: "/two" },
  ];
  assert.equal(homepageSettingsInputSchema.safeParse({ ...homepageSettingsDefaults, heroSlides }).success, false);
});

test("homepage settings reject an unsafe per-slide link", () => {
  const heroSlides = [{ id: "slide-1", desktopMediaId: "desktop-1", mobileMediaId: null, href: "javascript:alert(1)" }];
  assert.equal(homepageSettingsInputSchema.safeParse({ ...homepageSettingsDefaults, heroSlides }).success, false);
});

test("homepage settings accept ordered tile groups with every supported layout", () => {
  const tileGroups = ["TWO_COLUMNS", "THREE_COLUMNS", "FOUR_COLUMNS", "TWO_BY_TWO"].map((layout, groupIndex) => ({
    id: `group-${groupIndex}`,
    layout,
    tiles: Array.from({ length: groupIndex + 2 }, (_, tileIndex) => ({
      id: `tile-${groupIndex}-${tileIndex}`,
      mediaId: `media-${groupIndex}-${tileIndex}`,
      href: `/campaign/${groupIndex}/${tileIndex}`,
    })),
  }));
  const sections = [...homepageSettingsDefaults.sections, ...tileGroups.map((group) => ({ id: `TILE_GROUP:${group.id}`, enabled: true }))];
  const parsed = homepageSettingsInputSchema.parse({ ...homepageSettingsDefaults, sections, tileGroups });
  assert.equal(parsed.tileGroups[3].layout, "TWO_BY_TWO");
  assert.equal(parsed.tileGroups[0].tiles[1].href, "/campaign/0/1");
});

test("homepage settings reject duplicate tile identifiers and unsafe tile links", () => {
  const duplicatedTiles = [{ id: "group", layout: "TWO_COLUMNS", tiles: [
    { id: "same", mediaId: "media-1", href: "/one" },
    { id: "same", mediaId: "media-2", href: "/two" },
  ] }];
  assert.equal(homepageSettingsInputSchema.safeParse({ ...homepageSettingsDefaults, sections: [...homepageSettingsDefaults.sections, { id: "TILE_GROUP:group", enabled: true }], tileGroups: duplicatedTiles }).success, false);
  const unsafeLink = [{ id: "group", layout: "FOUR_COLUMNS", tiles: [{ id: "tile", mediaId: "media", href: "javascript:alert(1)" }] }];
  assert.equal(homepageSettingsInputSchema.safeParse({ ...homepageSettingsDefaults, sections: [...homepageSettingsDefaults.sections, { id: "TILE_GROUP:group", enabled: true }], tileGroups: unsafeLink }).success, false);
});

test("homepage settings require an independent layout item for every tile group", () => {
  const tileGroups = [{ id: "group", layout: "TWO_COLUMNS", tiles: [{ id: "tile", mediaId: "media", href: "/products" }] }];
  assert.equal(homepageSettingsInputSchema.safeParse({ ...homepageSettingsDefaults, tileGroups }).success, false);
  assert.equal(homepageSettingsInputSchema.safeParse({ ...homepageSettingsDefaults, sections: [...homepageSettingsDefaults.sections, { id: "TILE_GROUP:group", enabled: true }], tileGroups }).success, true);
});

test("homepage overview and hero settings can be updated independently", () => {
  const overview = homepageOverviewSettingsInputSchema.parse(homepageSettingsDefaults);
  const hero = homepageHeroSettingsInputSchema.parse(homepageSettingsDefaults);
  assert.equal("heroSlides" in overview, false);
  assert.equal("promoBannerEnabled" in hero, false);
});

test("homepage tiles can be updated independently from other homepage settings", () => {
  const tileGroups = [{ id: "group", layout: "TWO_COLUMNS", tiles: [{ id: "tile", mediaId: "media", href: "/products" }] }];
  const sections = [...homepageSettingsDefaults.sections, { id: "TILE_GROUP:group", enabled: true }];
  const parsed = homepageTilesSettingsInputSchema.parse({ sections, tileGroups });
  assert.equal(parsed.tileGroups[0].tiles[0].mediaId, "media");
  assert.equal("promoBannerEnabled" in parsed, false);
});

test("homepage layout can be updated independently from tile contents", () => {
  const parsed = homepageLayoutSettingsInputSchema.parse({ sections: [...homepageSettingsDefaults.sections].reverse() });
  assert.equal(parsed.sections[0].id, "CONCIERGE");
  assert.equal("tileGroups" in parsed, false);
});
