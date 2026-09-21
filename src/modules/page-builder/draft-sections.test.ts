import assert from "node:assert/strict";
import test from "node:test";
import { addDraftSectionId, commitDraftSections, discardDraftSections, readDraftSectionIds, withDraftSectionIds } from "./draft-sections";

const stored = {
  CATEGORIES: { title: "دسته‌ها" },
  PRODUCT_LISTS: { "PRODUCT_LIST:a": { title: "الف" }, "PRODUCT_LIST:b": { title: "ب" } },
  BANNER_SLIDERS: { "BANNER_SLIDER:c": { layout: "SLIDER_WIDE", slides: [] } },
  DRAFT_SECTIONS: ["PRODUCT_LIST:a", "BANNER_SLIDER:c"],
};

test("reads the draft ids and tolerates a missing or malformed document", () => {
  assert.deepEqual(readDraftSectionIds(stored), ["PRODUCT_LIST:a", "BANNER_SLIDER:c"]);
  assert.deepEqual(readDraftSectionIds(null), []);
  assert.deepEqual(readDraftSectionIds({ DRAFT_SECTIONS: "x" }), []);
  assert.deepEqual(readDraftSectionIds({ DRAFT_SECTIONS: ["a", 3] }), ["a"]);
});

test("adds a draft without duplicating it and keeps the rest of the document", () => {
  const next = addDraftSectionId(stored, "PRODUCT_LIST:a");
  assert.deepEqual(next.DRAFT_SECTIONS, ["PRODUCT_LIST:a", "BANNER_SLIDER:c"]);
  assert.deepEqual(next.CATEGORIES, stored.CATEGORIES);
  assert.deepEqual(addDraftSectionId({}, "PRODUCT_LIST:z"), { DRAFT_SECTIONS: ["PRODUCT_LIST:z"] });
});

test("drops the key when no drafts are left", () => {
  assert.equal("DRAFT_SECTIONS" in withDraftSectionIds(stored, []), false);
});

test("saving a layout commits only the drafts it contains", () => {
  const result = commitDraftSections(stored, ["HERO", "PRODUCT_LIST:a"]);
  assert.deepEqual(result.committed, ["PRODUCT_LIST:a"]);
  assert.deepEqual(result.stored.DRAFT_SECTIONS, ["BANNER_SLIDER:c"]);
  assert.deepEqual(result.stored.PRODUCT_LISTS, stored.PRODUCT_LISTS);
  assert.deepEqual(commitDraftSections(stored, ["HERO"]).committed, []);
});

test("discarding removes a draft's configuration and mark", () => {
  const result = discardDraftSections(stored, ["PRODUCT_LIST:a", "BANNER_SLIDER:c"]);
  assert.deepEqual(result.discarded, ["PRODUCT_LIST:a", "BANNER_SLIDER:c"]);
  assert.deepEqual(result.stored, { CATEGORIES: stored.CATEGORIES, PRODUCT_LISTS: { "PRODUCT_LIST:b": { title: "ب" } }, BANNER_SLIDERS: {} });
});

test("discarding never touches a section that is part of the page", () => {
  const result = discardDraftSections(stored, ["PRODUCT_LIST:b", "HERO"]);
  assert.deepEqual(result.discarded, []);
  assert.deepEqual(result.stored, stored);
});
