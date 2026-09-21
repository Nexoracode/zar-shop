import assert from "node:assert/strict";
import test from "node:test";
import { hostSections, pendingInLayout, replacedSectionsCss, type ContentEdits, type PendingSections } from "./pending-sections";

const listConfig = { layout: "SLIDER", title: "محصولات", description: "", moreLabel: "مشاهده همه", banner: null, source: "LATEST", categoryId: null, limit: 12 } as const;
const pending: PendingSections = {
  "BANNER_SLIDER:a": { kind: "banner", layout: "SLIDER_WIDE", items: [] },
  "PRODUCT_LIST:b": { kind: "list", config: listConfig },
};
const hero = { contentMode: "IMAGE_ONLY", title: "", description: "", buttonLabel: "" } as const;

test("only pending sections that are on the draft page are shown", () => {
  const layout = [{ id: "HERO", enabled: true }, { id: "BANNER_SLIDER:a", enabled: true }];
  assert.deepEqual(Object.keys(pendingInLayout(pending, layout)), ["BANNER_SLIDER:a"]);
});

test("a pending section that was removed from the draft is not shown", () => {
  const layout = [{ id: "PRODUCT_LIST:b", enabled: false, removed: true }];
  assert.deepEqual(pendingInLayout(pending, layout), {});
});

test("new sections and edited existing ones are drawn by the homepage; the edited ones replace the server's", () => {
  const edits: ContentEdits = {
    HERO: { kind: "hero", items: [] },
    "TILE_GROUP:t": { kind: "tiles", layout: "TWO_COLUMNS", items: [] },
    "PRODUCT_LIST:c": { kind: "list", config: listConfig },
    CATEGORIES: { kind: "categories", settings: { title: "دسته‌ها", description: "", moreLabel: "همه کالاها", limit: 10, sort: "MANUAL" } },
    "HEADER:menu": { kind: "menu", items: [] },
  };
  const layout = ["HERO", "TILE_GROUP:t", "PRODUCT_LIST:c", "BANNER_SLIDER:a", "CATEGORIES"].map((id) => ({ id, enabled: true }));
  const sections = hostSections(pending, edits, layout, hero);
  assert.deepEqual(Object.keys(sections).sort(), ["BANNER_SLIDER:a", "CATEGORIES", "HERO", "PRODUCT_LIST:c", "TILE_GROUP:t"]);
  assert.equal(sections["BANNER_SLIDER:a"].replaces, false);
  assert.equal(sections.HERO.replaces, true);
});

test("an edit of a section that was removed from the draft is not drawn", () => {
  const sections = hostSections({}, { HERO: { kind: "hero", items: [] } }, [{ id: "HERO", enabled: false, removed: true }], hero);
  assert.deepEqual(sections, {});
});

test("only replaced sections get their server-rendered version hidden", () => {
  const layout = ["HERO", "BANNER_SLIDER:a"].map((id) => ({ id, enabled: true }));
  const css = replacedSectionsCss(hostSections(pending, { HERO: { kind: "hero", items: [] } }, layout, hero));
  assert.ok(css.includes('[data-builder-section="HERO"]:not([data-builder-draft])'));
  assert.ok(!css.includes("BANNER_SLIDER"));
});
