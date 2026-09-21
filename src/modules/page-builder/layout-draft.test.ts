import assert from "node:assert/strict";
import test from "node:test";
import { isLayoutSection, isSectionHiddenAtRender, layoutCss, moveSection, removeSection, sameLayout, type LayoutSection } from "./layout-draft";

const sections: LayoutSection[] = [
  { id: "HERO", enabled: true },
  { id: "CATEGORIES", enabled: true },
  { id: "BRANDS", enabled: false },
  { id: "LATEST_PRODUCTS", enabled: true },
];
const ids = (list: LayoutSection[] | null) => list?.map((section) => section.id);
const allRendered = () => true;

test("moves a section down past the next visible one, skipping disabled sections", () => {
  assert.deepEqual(ids(moveSection(sections, "CATEGORIES", 1, allRendered)), ["HERO", "BRANDS", "LATEST_PRODUCTS", "CATEGORIES"]);
});

test("moves a section up", () => {
  assert.deepEqual(ids(moveSection(sections, "LATEST_PRODUCTS", -1, allRendered)), ["HERO", "LATEST_PRODUCTS", "CATEGORIES", "BRANDS"]);
});

test("skips sections the page did not render", () => {
  assert.deepEqual(ids(moveSection(sections, "LATEST_PRODUCTS", -1, (id) => id !== "CATEGORIES")), ["LATEST_PRODUCTS", "HERO", "CATEGORIES", "BRANDS"]);
});

test("returns null at the edges and for unknown ids", () => {
  assert.equal(moveSection(sections, "HERO", -1, allRendered), null);
  assert.equal(moveSection(sections, "LATEST_PRODUCTS", 1, allRendered), null);
  assert.equal(moveSection(sections, "HEADER", 1, allRendered), null);
});

test("removing flags the section as removed and disabled, in place", () => {
  const removed = removeSection(sections, "CATEGORIES");
  assert.deepEqual(removed?.map((section) => section.enabled), [true, false, false, true]);
  assert.deepEqual(removed?.map((section) => Boolean(section.removed)), [false, true, false, false]);
  assert.equal(removeSection(removed!, "CATEGORIES"), null);
  assert.equal(removeSection(sections, "FOOTER"), null);
});

test("a removed section is skipped when moving neighbours", () => {
  const removed = removeSection(sections, "CATEGORIES")!;
  assert.deepEqual(ids(moveSection(removed, "LATEST_PRODUCTS", -1, allRendered)), ["LATEST_PRODUCTS", "HERO", "CATEGORIES", "BRANDS"]);
});

test("knows which ids belong to the layout", () => {
  assert.equal(isLayoutSection(sections, "HERO"), true);
  assert.equal(isLayoutSection(sections, "HEADER"), false);
});

test("compares layouts by order and enabled state", () => {
  assert.equal(sameLayout(sections, sections.map((section) => ({ ...section }))), true);
  assert.equal(sameLayout(sections, removeSection(sections, "HERO")!), false);
});

test("builds the order and visibility stylesheet", () => {
  const layout = [{ id: "HERO", enabled: true }, { id: "TILE_GROUP:a", enabled: false }, { id: "BRANDS", enabled: false, removed: true }];
  assert.equal(layoutCss(layout, { editing: false }), '[data-builder-section="HERO"]{order:0 !important;}[data-builder-section="TILE_GROUP:a"]{order:1 !important;display:none !important;}[data-builder-section="BRANDS"]{order:2 !important;display:none !important;}');
  // While editing a disabled section stays visible, faded, so it can be switched back on; a removed one never returns.
  assert.equal(layoutCss(layout, { editing: true }), '[data-builder-section="HERO"]{order:0 !important;}[data-builder-section="TILE_GROUP:a"]{order:1 !important;opacity:0.35 !important;}[data-builder-section="BRANDS"]{order:2 !important;display:none !important;}');
});

test("a disabled section is rendered hidden only for viewers who cannot edit", () => {
  assert.equal(isSectionHiddenAtRender({ id: "HERO", enabled: false }, false), true);
  assert.equal(isSectionHiddenAtRender({ id: "HERO", enabled: false }, true), false);
  assert.equal(isSectionHiddenAtRender({ id: "HERO", enabled: false, removed: true }, true), true);
  assert.equal(isSectionHiddenAtRender({ id: "HERO", enabled: true }, false), false);
  assert.equal(isSectionHiddenAtRender(undefined, false), false);
});
