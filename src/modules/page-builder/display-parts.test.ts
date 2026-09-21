import assert from "node:assert/strict";
import test from "node:test";
import { displayCss, isPartHidden, isSectionEnabled, normalizeDisplay, pageDisplaySchema, parseStoredDisplay, sameDisplay, sectionDisplayParts, setSectionDisplay } from "./display-parts";

test("the header has different switchable parts per industry", () => {
  assert.ok(sectionDisplayParts("HEADER", "GENERAL")?.some((part) => part.id === "categories"));
  assert.ok(sectionDisplayParts("HEADER", "GOLD")?.some((part) => part.id === "goldPrice"));
  assert.equal(sectionDisplayParts("HEADER", "GENERAL")?.some((part) => part.id === "goldPrice"), false);
  assert.equal(sectionDisplayParts("HERO", "GENERAL"), null);
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
  assert.equal(schema.safeParse({ HERO: { enabled: false, hiddenParts: [] } }).success, false);
});

test("stored garbage counts as nothing customised", () => {
  assert.deepEqual(parseStoredDisplay("nope"), {});
  assert.deepEqual(parseStoredDisplay(null), {});
});
