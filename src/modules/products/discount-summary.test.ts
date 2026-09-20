import assert from "node:assert/strict";
import test from "node:test";
import { combinationLabel, summarizeDiscounts } from "./discount-summary";

const now = new Date("2026-09-19T12:00:00.000Z");
const none = { discountType: null, discountValue: null, discountStartsAt: null, discountEndsAt: null };
const window = (start: string, end: string) => ({ discountStartsAt: new Date(start), discountEndsAt: new Date(end) });
const variant = (selection: Record<string, string>, extra: object = {}, isActive = true) => ({ selection, isActive, ...none, ...extra });
/** The default variant of a product without options — its discount is the whole product's. */
const defaultVariant = (extra: object = {}) => variant({}, extra);

test("a combination is named by its values, in the order stored", () => {
  assert.equal(combinationLabel({ "رنگ": "مشکی", "سایز": "XL" }), "مشکی، XL");
  assert.equal(combinationLabel({}), "ترکیب");
  assert.equal(combinationLabel(null), "ترکیب");
});

test("a product with no discount anywhere has nothing to show", () => {
  assert.deepEqual(summarizeDiscounts({ variants: [variant({ "رنگ": "مشکی" })] }, now), { active: [], upcoming: [] });
});

test("a product without options reports its default variant's discount as the whole product's, with its window", () => {
  const summary = summarizeDiscounts({ variants: [defaultVariant({ discountType: "PERCENT", discountValue: "20", ...window("2026-09-01T00:00:00Z", "2026-10-01T00:00:00Z") })] }, now);
  assert.equal(summary.active.length, 1);
  assert.deepEqual([summary.active[0].scope, summary.active[0].label, summary.active[0].type, summary.active[0].value], ["product", "کل محصول", "PERCENT", 20]);
  assert.ok(summary.active[0].startsAt && summary.active[0].endsAt);
});

test("a discount with no window at all is a running special sale", () => {
  const summary = summarizeDiscounts({ variants: [defaultVariant({ discountType: "FIXED", discountValue: 50000, discountStartsAt: null, discountEndsAt: null })] }, now);
  assert.equal(summary.active.length, 1);
  assert.equal(summary.active[0].startsAt, null);
});

test("discounts that live only on combinations are found, each under its own name", () => {
  const summary = summarizeDiscounts({
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
    variants: [
      variant({ "رنگ": "مشکی" }, { discountType: "PERCENT", discountValue: 25, discountStartsAt: null, discountEndsAt: null }, false),
      variant({ "رنگ": "سفید" }, { discountType: "PERCENT", discountValue: 0, discountStartsAt: null, discountEndsAt: null }),
    ],
  }, now);
  assert.deepEqual(summary, { active: [], upcoming: [] });
});

test("a combination without a discount of its own shows none, whatever the others carry", () => {
  const summary = summarizeDiscounts({
    variants: [
      variant({ "رنگ": "مشکی" }, { discountType: "PERCENT", discountValue: 25, discountStartsAt: null, discountEndsAt: null }),
      variant({ "رنگ": "سفید" }),
    ],
  }, now);
  assert.deepEqual(summary.active.map((entry) => entry.label), ["مشکی"]);
});
