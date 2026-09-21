import assert from "node:assert/strict";
import test from "node:test";
import { PRODUCT_CARD_GROUP, displayCss, productCardParts, isPartHidden, isSectionEnabled, normalizeDisplay, pageDisplaySchema, parseStoredDisplay, sameDisplay, sectionDisplayConfig, setSectionDisplay } from "./display-parts";

test("the header has different switchable parts per industry", () => {
  assert.ok(sectionDisplayConfig("HEADER", "GENERAL")?.parts.some((part) => part.id === "categories"));
  assert.ok(sectionDisplayConfig("HEADER", "GOLD")?.parts.some((part) => part.id === "goldPrice"));
  assert.equal(sectionDisplayConfig("HEADER", "GENERAL")?.parts.some((part) => part.id === "goldPrice"), false);
  assert.equal(sectionDisplayConfig("BRANDS", "GENERAL"), null);
  assert.deepEqual(sectionDisplayConfig("HERO", "GOLD")?.parts.map((part) => part.id), ["arrows", "dots"]);
});

test("the footer and the promo banner only have the whole-section switch", () => {
  assert.deepEqual(sectionDisplayConfig("FOOTER", "GENERAL"), { parts: [], master: "display", masterLabel: undefined });
  assert.equal(sectionDisplayConfig("PROMO_BANNER", "GOLD")?.master, "display");

test("the slider's on/off switch lives in the layout, the header's here", () => {
  assert.equal(sectionDisplayConfig("HERO", "GENERAL")?.master, "layout");
  assert.equal(sectionDisplayConfig("HEADER", "GENERAL")?.master, "display");
});

test("a section without settings is enabled with nothing hidden", () => {
  assert.equal(isSectionEnabled({}, "HEADER"), true);
  assert.equal(isPartHidden({}, "HEADER", "search"), false);
});

test("normalizing drops default sections and orders the rest", () => {
  const display = normalizeDisplay({ FOOTER: { enabled: true, hiddenParts: [] }, HEADER: { enabled: true, hiddenParts: ["search", "cart", "search"] } });
  assert.deepEqual(display, { HEADER: { enabled: true, hiddenParts: ["cart", "search"] } });
});

test("setting a section back to the default removes it, and equal settings compare equal", () => {
  const hidden = setSectionDisplay({}, "HEADER", { enabled: true, hiddenParts: ["search"] });
  assert.equal(isPartHidden(hidden, "HEADER", "search"), true);
  assert.deepEqual(setSectionDisplay(hidden, "HEADER", { enabled: true, hiddenParts: [] }), {});
  assert.equal(sameDisplay({ HEADER: { enabled: true, hiddenParts: ["a", "b"] } }, { HEADER: { enabled: true, hiddenParts: ["b", "a"] } }), true);
});

test("builds the stylesheet; a disabled section is only faded while editing", () => {
  const display = { HEADER: { enabled: false, hiddenParts: ["search"] } };
  assert.equal(displayCss(display, { editing: false }), '[data-builder-section="HEADER"]{display:none !important;}[data-builder-part="HEADER:search"]{display:none !important;}');
  assert.equal(displayCss(display, { editing: true }), '[data-builder-section="HEADER"]{opacity:0.35 !important;}[data-builder-part="HEADER:search"]{display:none !important;}');
});

test("the save schema accepts known parts only", () => {
  const schema = pageDisplaySchema("GENERAL");
  assert.equal(schema.safeParse({ HEADER: { enabled: true, hiddenParts: ["search"] } }).success, true);
  assert.equal(schema.safeParse({ HEADER: { enabled: true, hiddenParts: ["goldPrice"] } }).success, false);
  assert.equal(schema.safeParse({ BRANDS: { enabled: true, hiddenParts: [] } }).success, false);
  assert.equal(schema.safeParse({ CATEGORIES: { enabled: true, hiddenParts: ["more", "categoryImage"] } }).success, true);
  assert.equal(schema.safeParse({ HERO: { enabled: true, hiddenParts: ["arrows"] } }).success, true);
  // The slider's whole-section switch is stored in the layout, so it can't be turned off here.
  assert.equal(schema.safeParse({ HERO: { enabled: false, hiddenParts: [] } }).success, false);
});

test("stored garbage counts as nothing customised", () => {
  assert.deepEqual(parseStoredDisplay("nope"), {});
  assert.deepEqual(parseStoredDisplay(null), {});
});

test("sections that list product cards can switch the card's parts, gold and general worded differently", () => {
  const featured = sectionDisplayConfig("FEATURED_PRODUCTS", "GENERAL")?.parts ?? [];
  assert.ok(featured.some((part) => part.id === "countdown"));
  assert.deepEqual(featured.filter((part) => part.group === PRODUCT_CARD_GROUP).map((part) => part.id), productCardParts("GENERAL").map((part) => part.id));
  assert.equal(productCardParts("GOLD").find((part) => part.id === "card.badge")?.label, "برچسب اجرت / تخفیف");
  assert.equal(productCardParts("GENERAL").find((part) => part.id === "card.badge")?.label, "درصد تخفیف");
  const schema = pageDisplaySchema("GENERAL");
  assert.equal(schema.safeParse({ FEATURED_PRODUCTS: { enabled: true, hiddenParts: ["card.price", "countdown"] } }).success, true);
  assert.equal(schema.safeParse({ POPULAR_PRODUCTS: { enabled: true, hiddenParts: ["countdown"] } }).success, false);
  // The gold template has no flash-deals section.
  assert.equal(pageDisplaySchema("GOLD").safeParse({ FEATURED_PRODUCTS: { enabled: true, hiddenParts: ["card.price"] } }).success, false);
});
