import assert from "node:assert/strict";
import test from "node:test";
import { pageSectionLimits } from "../settings/settings-limits";
import { arrangeCategories, categoriesSectionDefaults, categoriesSectionSettingsSchema, isSectionSettingsId, parseStoredSectionSettings, sectionContentFields } from "./section-settings";

const category = (name: string, products: number) => ({ name, _count: { products } });
const items = [category("موبایل", 4), category("پوشاک", 9), category("ابزار", 4)];
const names = (list: { name: string }[]) => list.map((item) => item.name);

test("the defaults are the strip as it was before it became editable", () => {
  assert.deepEqual(categoriesSectionDefaults, { title: "خرید بر اساس دسته‌بندی", description: "", moreLabel: "همه کالاها", limit: 10, sort: "MANUAL" });
  assert.equal(categoriesSectionSettingsSchema.safeParse(categoriesSectionDefaults).success, true);
});

test("the title and the count are validated with Persian messages", () => {
  const short = categoriesSectionSettingsSchema.safeParse({ ...categoriesSectionDefaults, title: "د" });
  assert.equal(short.success, false);
  assert.match(short.error?.issues[0].message ?? "", /حداقل/);
  assert.equal(categoriesSectionSettingsSchema.safeParse({ ...categoriesSectionDefaults, limit: 0 }).success, false);
  assert.equal(categoriesSectionSettingsSchema.safeParse({ ...categoriesSectionDefaults, limit: pageSectionLimits.categoriesMax + 1 }).success, false);
  assert.equal(categoriesSectionSettingsSchema.safeParse({ ...categoriesSectionDefaults, limit: 2.5 }).success, false);
  assert.equal(categoriesSectionSettingsSchema.safeParse({ ...categoriesSectionDefaults, sort: "RANDOM" }).success, false);
});

test("stored settings fall back to the defaults piece by piece", () => {
  assert.deepEqual(parseStoredSectionSettings(null).CATEGORIES, categoriesSectionDefaults);
  assert.deepEqual(parseStoredSectionSettings({ CATEGORIES: { limit: 6 } }).CATEGORIES, { ...categoriesSectionDefaults, limit: 6 });
  assert.deepEqual(parseStoredSectionSettings({ CATEGORIES: { limit: "many" } }).CATEGORIES, categoriesSectionDefaults);
});

test("knows which sections have content settings", () => {
  assert.equal(isSectionSettingsId("CATEGORIES"), true);
  assert.equal(isSectionSettingsId("FEATURED_PRODUCTS"), false);
  assert.equal(isSectionSettingsId("HERO"), false);
});

test("arranges the categories by the administrator's order, by name or by product count, and cuts to the limit", () => {
  assert.deepEqual(names(arrangeCategories(items, { sort: "MANUAL", limit: 2 })), ["موبایل", "پوشاک"]);
  assert.deepEqual(names(arrangeCategories(items, { sort: "NAME", limit: 3 })), ["ابزار", "پوشاک", "موبایل"]);
  assert.deepEqual(names(arrangeCategories(items, { sort: "MOST_PRODUCTS", limit: 3 })), ["پوشاک", "موبایل", "ابزار"]);
});

test("every section with settings has form fields for exactly its schema's keys", () => {
  assert.deepEqual(sectionContentFields.CATEGORIES.map((field) => field.name), ["title", "description", "moreLabel", "limit", "sort"]);
});
