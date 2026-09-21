import assert from "node:assert/strict";
import test from "node:test";
import { pendingInLayout, type PendingSections } from "./pending-sections";

const pending: PendingSections = {
  "BANNER_SLIDER:a": { kind: "banner", layout: "SLIDER_WIDE", items: [] },
  "PRODUCT_LIST:b": { kind: "list", config: { layout: "SLIDER", title: "محصولات", description: "", source: "LATEST", categoryId: null, limit: 12 } },
};

test("only pending sections that are on the draft page are shown", () => {
  const layout = [{ id: "HERO", enabled: true }, { id: "BANNER_SLIDER:a", enabled: true }];
  assert.deepEqual(Object.keys(pendingInLayout(pending, layout)), ["BANNER_SLIDER:a"]);
});

test("a pending section that was removed from the draft is not shown", () => {
  const layout = [{ id: "PRODUCT_LIST:b", enabled: false, removed: true }];
  assert.deepEqual(pendingInLayout(pending, layout), {});
});
