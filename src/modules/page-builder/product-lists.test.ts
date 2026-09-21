import assert from "node:assert/strict";
import test from "node:test";
import { pageSectionLimits } from "../settings/settings-limits";
import { normalizeDisplay } from "./display-parts";
import {
  builtInProductLists, isProductListId, newProductListConfig, newProductListId, productListConfigSchema, productListDisplayConfig, productListLayoutMeta, productListLayouts, productListMoreHref,
  productListSourceLabels, productListSources, pruneDisplayForList, resolveProductLists,
} from "./product-lists";

test("there are eight layouts, each with a name and a sensible count", () => {
  assert.equal(productListLayouts.length, 8);
  for (const layout of productListLayouts) {
    const meta = productListLayoutMeta[layout];
    assert.ok(meta.label.length > 0);
    assert.ok(meta.defaultLimit >= pageSectionLimits.productListMin && meta.defaultLimit <= pageSectionLimits.productListMax);
  }
});

test("a new list starts on the latest products with the layout's own count", () => {
  const config = newProductListConfig("GROUPED_PANELS");
  assert.equal(config.source, "LATEST");
  assert.equal(config.limit, productListLayoutMeta.GROUPED_PANELS.defaultLimit);
  assert.equal(productListConfigSchema.safeParse(config).success, true);
});

test("the category is required for the category source and only for it", () => {
  const base = newProductListConfig("SLIDER");
  assert.equal(productListConfigSchema.safeParse({ ...base, source: "CATEGORY", categoryId: null }).success, false);
  assert.equal(productListConfigSchema.safeParse({ ...base, source: "CATEGORY", categoryId: "cat-1" }).success, true);
  assert.equal(productListConfigSchema.safeParse({ ...base, source: "POPULAR", categoryId: "cat-1" }).success, false);
});

test("the title and the count are validated", () => {
  const base = newProductListConfig("SLIDER");
  assert.equal(productListConfigSchema.safeParse({ ...base, title: "م" }).success, false);
  assert.equal(productListConfigSchema.safeParse({ ...base, limit: 0 }).success, false);
  assert.equal(productListConfigSchema.safeParse({ ...base, limit: pageSectionLimits.productListMax + 1 }).success, false);
  assert.equal(productListConfigSchema.safeParse({ ...base, layout: "TABLE" }).success, false);
});

test("ids of added lists are recognised", () => {
  assert.equal(isProductListId(newProductListId("3f2a-9b")), true);
  assert.equal(isProductListId("PRODUCT_LIST:"), false);
  assert.equal(isProductListId("FEATURED_PRODUCTS"), false);
});

test("the general template's three fixed product sections are built-in lists; the gold one has none", () => {
  const general = resolveProductLists(null, "GENERAL");
  assert.deepEqual(Object.keys(general), ["FEATURED_PRODUCTS", "POPULAR_PRODUCTS", "LATEST_PRODUCTS"]);
  assert.deepEqual(general.FEATURED_PRODUCTS, builtInProductLists.FEATURED_PRODUCTS);
  assert.deepEqual(resolveProductLists(null, "GOLD"), {});
});

test("saved lists overlay the built-ins and are added, invalid ones are ignored", () => {
  const added = newProductListId("abc");
  const stored = { PRODUCT_LISTS: { POPULAR_PRODUCTS: { ...builtInProductLists.POPULAR_PRODUCTS, layout: "GRID_COMPACT" }, [added]: newProductListConfig("BANNER_ROW"), "PRODUCT_LIST:bad": { layout: "NOPE" }, NOT_A_LIST: newProductListConfig("SLIDER") } };
  const lists = resolveProductLists(stored, "GENERAL");
  assert.equal(lists.POPULAR_PRODUCTS.layout, "GRID_COMPACT");
  assert.equal(lists[added].layout, "BANNER_ROW");
  assert.equal("PRODUCT_LIST:bad" in lists, false);
  assert.equal("NOT_A_LIST" in lists, false);
  assert.ok(added in resolveProductLists(stored, "GOLD"));
});

test("the flash deals keep the title and count they had stored before they became a product list", () => {
  const lists = resolveProductLists({ FEATURED_PRODUCTS: { title: "پیشنهاد ویژه", limit: 8 } }, "GENERAL");
  assert.equal(lists.FEATURED_PRODUCTS.title, "پیشنهاد ویژه");
  assert.equal(lists.FEATURED_PRODUCTS.limit, 8);
  assert.equal(lists.FEATURED_PRODUCTS.layout, "PANEL_SLIDER");
});

test("the switches depend on the layout and source, and always include the card's", () => {
  const ids = (layout: (typeof productListLayouts)[number], source: "LATEST" | "DISCOUNTED" = "LATEST") => productListDisplayConfig({ ...newProductListConfig(layout), source }, "GENERAL").parts.map((part) => part.id);
  assert.deepEqual(ids("GRID_COMPACT").slice(0, 3), ["title", "description", "more"]);
  assert.deepEqual(ids("PANEL_SLIDER", "DISCOUNTED").slice(0, 5), ["icon", "title", "description", "countdown", "more"]);
  assert.equal(ids("GRID_COMPACT").includes("arrows"), false);
  assert.equal(ids("SLIDER").includes("arrows"), true);
  assert.equal(ids("SLIDER").includes("viewAll"), true);
  assert.equal(ids("PANEL_SLIDER").includes("icon"), true);
  assert.equal(ids("PANEL_SLIDER").includes("countdown"), false);
  assert.equal(ids("PANEL_SLIDER", "DISCOUNTED").includes("countdown"), true);
  assert.equal(ids("LIST_TWO_COLUMNS").includes("card.price"), true);
  // The two ranked layouts (list mode and the compact grid) have a switch for their rank badges; no other layout does.
  assert.equal(ids("LIST_TWO_COLUMNS").includes("rank"), true);
  assert.equal(ids("GRID_COMPACT").includes("rank"), true);
  assert.equal(ids("SLIDER").includes("rank"), false);
  assert.equal(productListLayoutMeta.LIST_TWO_COLUMNS.label, "حالت لیستی");
  assert.equal(productListDisplayConfig(newProductListConfig("SLIDER"), "GENERAL").master, "layout");
});

test("changing a list's layout drops the switches the new layout does not have", () => {
  const display = normalizeDisplay({ "PRODUCT_LIST:a": { enabled: true, hiddenParts: ["arrows", "title", "card.price"] }, HEADER: { enabled: true, hiddenParts: ["search"] } });
  const pruned = pruneDisplayForList(display, "PRODUCT_LIST:a", newProductListConfig("GRID_COMPACT"), "GENERAL");
  assert.deepEqual(pruned["PRODUCT_LIST:a"].hiddenParts, ["card.price", "title"]);
  assert.deepEqual(pruned.HEADER, display.HEADER);
  assert.equal(pruneDisplayForList({}, "PRODUCT_LIST:a", newProductListConfig("SLIDER"), "GENERAL")["PRODUCT_LIST:a"], undefined);
});

test("the view-more link follows the source", () => {
  const config = newProductListConfig("SLIDER");
  assert.equal(productListMoreHref({ ...config, source: "POPULAR" }, null), "/products?sortby=popular");
  assert.equal(productListMoreHref({ ...config, source: "LATEST" }, null), "/products?sortby=newest");
  assert.equal(productListMoreHref({ ...config, source: "CATEGORY", categoryId: "c" }, "phones"), "/products?category=phones");
  assert.equal(productListMoreHref({ ...config, source: "DISCOUNTED" }, null), "/products");
  assert.equal(productListMoreHref({ ...config, source: "BEST_SELLING" }, null), "/products?sortby=popular");
});

test("the description is optional rich text, bounded by its visible characters, and lists stored without one still load", () => {
  const base = newProductListConfig("SLIDER");
  assert.equal(base.description, "");
  assert.equal(productListConfigSchema.safeParse({ ...base, description: "<p>توضیح <strong>کوتاه</strong></p>" }).success, true);
  // The markup does not count against the limit, the visible text does.
  assert.equal(productListConfigSchema.safeParse({ ...base, description: `<p><strong>${"ت".repeat(pageSectionLimits.description)}</strong></p>` }).success, true);
  assert.equal(productListConfigSchema.safeParse({ ...base, description: `<p>${"ت".repeat(pageSectionLimits.description + 1)}</p>` }).success, false);
  const { description, ...withoutDescription } = base;
  assert.equal(description, "");
  assert.equal(productListConfigSchema.parse(withoutDescription).description, "");
  assert.equal(resolveProductLists({ PRODUCT_LISTS: { "PRODUCT_LIST:old": withoutDescription } }, "GENERAL")["PRODUCT_LIST:old"].description, "");
  // The popular products keep the sentence they always had under their title.
  assert.ok(resolveProductLists(null, "GENERAL").POPULAR_PRODUCTS.description.length > 0);
});

test("the best sellers are a source of their own, next to the popular products", () => {
  assert.ok(productListSources.includes("BEST_SELLING"));
  assert.equal(productListSourceLabels.BEST_SELLING, "پرفروش‌ترین محصولات");
  assert.equal(productListConfigSchema.safeParse({ ...newProductListConfig("SLIDER"), source: "BEST_SELLING" }).success, true);
  assert.equal(productListConfigSchema.safeParse({ ...newProductListConfig("SLIDER"), source: "BEST_SELLING", categoryId: "c" }).success, false);
});
