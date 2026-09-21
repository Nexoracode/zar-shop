import assert from "node:assert/strict";
import test from "node:test";
import { displayCss, isPartHidden, isSectionEnabled, normalizeDisplay, pageDisplaySchema, parseStoredDisplay, sameDisplay, sectionDisplayConfig, setSectionDisplay } from "./display-parts";

test("the header has different switchable parts per industry", () => {
  assert.ok(sectionDisplayConfig("HEADER", "GENERAL")?.parts.some((part) => part.id === "categories"));
  assert.ok(sectionDisplayConfig("HEADER", "GOLD")?.parts.some((part) => part.id === "goldPrice"));
  assert.equal(sectionDisplayConfig("HEADER", "GENERAL")?.parts.some((part) => part.id === "goldPrice"), false);
  assert.equal(sectionDisplayConfig("CATEGORIES", "GENERAL"), null);
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
  assert.equal(schema.safeParse({ CATEGORIES: { enabled: true, hiddenParts: [] } }).success, false);
  assert.equal(schema.safeParse({ HERO: { enabled: true, hiddenParts: ["arrows"] } }).success, true);
  // The slider's whole-section switch is stored in the layout, so it can't be turned off here.
  assert.equal(schema.safeParse({ HERO: { enabled: false, hiddenParts: [] } }).success, false);
});

test("stored garbage counts as nothing customised", () => {
  assert.deepEqual(parseStoredDisplay("nope"), {});
  assert.deepEqual(parseStoredDisplay(null), {});
});
