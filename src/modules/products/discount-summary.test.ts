import assert from "node:assert/strict";
import test from "node:test";
import { combinationLabel, summarizeDiscounts } from "./discount-summary";

const now = new Date("2026-09-19T12:00:00.000Z");
const none = { discountType: null, discountValue: null, discountStartsAt: null, discountEndsAt: null };
const window = (start: string, end: string) => ({ discountStartsAt: new Date(start), discountEndsAt: new Date(end) });
const variant = (selection: Record<string, string>, extra: object = {}, isActive = true) => ({ selection, isActive, ...none, ...extra });

test("a combination is named by its values, in the order stored", () => {
  assert.equal(combinationLabel({ "رنگ": "مشکی", "سایز": "XL" }), "مشکی، XL");
  assert.equal(combinationLabel({}), "ترکیب");
  assert.equal(combinationLabel(null), "ترکیب");
});

test("a product with no discount anywhere has nothing to show", () => {
  assert.deepEqual(summarizeDiscounts({ ...none, variants: [variant({ "رنگ": "مشکی" })] }, now), { active: [], upcoming: [] });
});

test("the product's own running discount is listed first, with its window", () => {
  const summary = summarizeDiscounts({ discountType: "PERCENT", discountValue: "20", ...window("2026-09-01T00:00:00Z", "2026-10-01T00:00:00Z"), variants: [] }, now);
  assert.equal(summary.active.length, 1);
  assert.deepEqual([summary.active[0].scope, summary.active[0].label, summary.active[0].type, summary.active[0].value], ["product", "کل محصول", "PERCENT", 20]);
  assert.ok(summary.active[0].startsAt && summary.active[0].endsAt);
});

test("a discount with no window at all is a running special sale", () => {
  const summary = summarizeDiscounts({ discountType: "FIXED", discountValue: 50000, discountStartsAt: null, discountEndsAt: null, variants: [] }, now);
  assert.equal(summary.active.length, 1);
  assert.equal(summary.active[0].startsAt, null);
});

test("discounts that live only on combinations are found, each under its own name", () => {
  const summary = summarizeDiscounts({
    ...none,
    variants: [
      variant({ "رنگ": "مشکی", "سایز": "XL" }, { discountType: "PERCENT", discountValue: "30", ...window("2026-09-10T00:00:00Z", "2026-09-30T00:00:00Z") }),
      variant({ "رنگ": "سفید", "سایز": "M" }),
      variant({ "رنگ": "قرمز", "سایز": "L" }, { discountType: "FIXED", discountValue: "10000", discountStartsAt: null, discountEndsAt: null }),
    ],
  }, now);
  assert.deepEqual(summary.active.map((entry) => [entry.scope, entry.label, entry.type, entry.value]), [["variant", "مشکی، XL", "PERCENT", 30], ["variant", "قرمز، L", "FIXED", 10000]]);
  assert.equal(summary.upcoming.length, 0);
});

test("a window that has not opened is upcoming, and one that has closed is dropped", () => {
  const summary = summarizeDiscounts({
    ...none,
    variants: [
      variant({ "رنگ": "آبی" }, { discountType: "PERCENT", discountValue: 15, ...window("2026-10-05T00:00:00Z", "2026-10-20T00:00:00Z") }),
      variant({ "رنگ": "سبز" }, { discountType: "PERCENT", discountValue: 15, ...window("2026-08-01T00:00:00Z", "2026-08-10T00:00:00Z") }),
    ],
  }, now);
  assert.deepEqual(summary.upcoming.map((entry) => entry.label), ["آبی"]);
  assert.equal(summary.active.length, 0);
});

test("a combination that is switched off, or a zero-value discount, is ignored", () => {
  const summary = summarizeDiscounts({
    discountType: "PERCENT", discountValue: 0, discountStartsAt: null, discountEndsAt: null,
    variants: [variant({ "رنگ": "مشکی" }, { discountType: "PERCENT", discountValue: 25, discountStartsAt: null, discountEndsAt: null }, false)],
  }, now);
  assert.deepEqual(summary, { active: [], upcoming: [] });
});

test("the product's discount and its combinations' can all be active together", () => {
  const summary = summarizeDiscounts({
    discountType: "PERCENT", discountValue: 10, discountStartsAt: null, discountEndsAt: null,
    variants: [variant({ "رنگ": "مشکی" }, { discountType: "PERCENT", discountValue: 25, discountStartsAt: null, discountEndsAt: null })],
  }, now);
  assert.deepEqual(summary.active.map((entry) => entry.label), ["کل محصول", "مشکی"]);
});
