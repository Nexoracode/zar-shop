import assert from "node:assert/strict";
import test from "node:test";
import { addDraftSectionId, commitDraftSections, deleteSectionInstances, discardDraftSections, isSectionInstanceId, readDraftSectionIds, withDraftSectionIds } from "./draft-sections";

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

test("only the sections the builder adds count as instances", () => {
  assert.equal(isSectionInstanceId("PRODUCT_LIST:a"), true);
  assert.equal(isSectionInstanceId("BANNER_SLIDER:a"), true);
  assert.equal(isSectionInstanceId("CATEGORY_STRIP:a"), true);
  assert.equal(isSectionInstanceId("HERO"), false);
  assert.equal(isSectionInstanceId("TILE_GROUP:a"), false);
});

test("deleting instances removes their configuration but never a built-in section's", () => {
  const result = deleteSectionInstances({ ...stored, CATEGORY_STRIPS: { "CATEGORY_STRIP:s": {} } }, ["PRODUCT_LIST:b", "CATEGORY_STRIP:s", "HERO", "FEATURED_PRODUCTS"]);
  assert.deepEqual(result.deleted, ["PRODUCT_LIST:b", "CATEGORY_STRIP:s"]);
  assert.deepEqual(result.stored.PRODUCT_LISTS, { "PRODUCT_LIST:a": { title: "الف" } });
  assert.deepEqual(result.stored.CATEGORY_STRIPS, {});
  assert.deepEqual(result.stored.DRAFT_SECTIONS, ["PRODUCT_LIST:a", "BANNER_SLIDER:c"]);
});
