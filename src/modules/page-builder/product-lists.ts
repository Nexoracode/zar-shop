import { z } from "zod";
import { richTextPlainLength } from "@/modules/page-builder/rich-text";
import { normalizeDisplay, productCardParts, type DisplayPart, type PageBuilderIndustry, type PageDisplay, type SectionDisplayConfig } from "@/modules/page-builder/display-parts";
import { pageSectionLimits } from "@/modules/settings/settings-limits";

// "Product list" is one kind of homepage section with several looks (its layout), a source of products and a few
// details. The old fixed sections — the flash deals, the popular products and (in the general template) the latest
// products — are instances of it under their old ids; new instances get an id of the form `PRODUCT_LIST:<uuid>`.
// Configurations live in the page-section settings (`pageSectionSettings.PRODUCT_LISTS`, by section id).

export const productListLayouts = ["GRID_COMPACT", "SLIDER", "FEATURE_SLIDER", "BANNER_ROW", "FEATURE_LIST", "PANEL_SLIDER", "LIST_TWO_COLUMNS", "GROUPED_PANELS"] as const;
export type ProductListLayout = (typeof productListLayouts)[number];

export const productListLayoutMeta: Record<ProductListLayout, { label: string; defaultLimit: number; /** Scrolls sideways, so it has arrows and a "view all" card. */ slider: boolean }> = {
  GRID_COMPACT: { label: "شبکه فشرده", defaultLimit: 9, slider: false },
  SLIDER: { label: "اسلایدر کارت‌ها", defaultLimit: 12, slider: true },
  FEATURE_SLIDER: { label: "محصول شاخص و اسلایدر", defaultLimit: 12, slider: true },
  BANNER_ROW: { label: "بنر و ردیف محصولات", defaultLimit: 6, slider: false },
  FEATURE_LIST: { label: "محصول شاخص و فهرست", defaultLimit: 4, slider: false },
  PANEL_SLIDER: { label: "قاب رنگی و اسلایدر", defaultLimit: 12, slider: true },
  // "List mode": ranked columns of three, like the best-selling products. (The id predates the redesign and is kept so
  // lists stored with it keep working.)
  LIST_TWO_COLUMNS: { label: "حالت لیستی", defaultLimit: 12, slider: false },
  GROUPED_PANELS: { label: "قاب‌های گروهی", defaultLimit: 12, slider: false },
};

export const productListSources = ["LATEST", "POPULAR", "BEST_SELLING", "DISCOUNTED", "CATEGORY"] as const;
export type ProductListSource = (typeof productListSources)[number];
export const productListSourceLabels: Record<ProductListSource, string> = {
  LATEST: "جدیدترین محصولات",
  POPULAR: "محبوب‌ترین محصولات",
  BEST_SELLING: "پرفروش‌ترین محصولات",
  DISCOUNTED: "شگفت‌انگیز (تخفیف‌دار)",
  CATEGORY: "یک دسته‌بندی",
};

/** What a product list's "view all" link says unless the store owner words it otherwise. */
export const productListDefaultMoreLabel = "مشاهده همه";

export const productListConfigSchema = z.object({
  layout: z.enum(productListLayouts, { error: "ظاهر لیست را انتخاب کنید." }),
  title: z.string().trim()
    .min(2, "عنوان بخش باید حداقل ۲ نویسه باشد.")
    .max(pageSectionLimits.title, `عنوان بخش نباید بیشتر از ${pageSectionLimits.title.toLocaleString("fa-IR")} نویسه باشد.`),
  // Rich text (HTML) shown under the title when there is any. Lists stored before it existed have none.
  description: z.string().trim()
    .max(pageSectionLimits.descriptionHtml, "توضیحات بیش از حد طولانی است.")
    .refine((html) => richTextPlainLength(html) <= pageSectionLimits.description, `توضیحات نباید بیشتر از ${pageSectionLimits.description.toLocaleString("fa-IR")} کاراکتر باشد.`)
    .default(""),
  // The wording of the "view all" link; lists stored before it existed keep the old one.
  moreLabel: z.string().trim()
    .min(2, "متن دکمه باید حداقل ۲ نویسه باشد.")
    .max(pageSectionLimits.moreLabel, `متن دکمه نباید بیشتر از ${pageSectionLimits.moreLabel.toLocaleString("fa-IR")} نویسه باشد.`)
    .default(productListDefaultMoreLabel),
  source: z.enum(productListSources, { error: "منبع محصولات را انتخاب کنید." }),
  categoryId: z.string().trim().min(1).max(191).nullable(),
  limit: z.number({ error: "تعداد نمایش را به‌صورت عدد وارد کنید." })
    .int("تعداد نمایش باید عدد صحیح باشد.")
    .min(pageSectionLimits.productListMin, `تعداد نمایش باید حداقل ${pageSectionLimits.productListMin.toLocaleString("fa-IR")} باشد.`)
    .max(pageSectionLimits.productListMax, `تعداد نمایش نباید بیشتر از ${pageSectionLimits.productListMax.toLocaleString("fa-IR")} باشد.`),
}).superRefine((config, context) => {
  if (config.source === "CATEGORY" && !config.categoryId) context.addIssue({ code: "custom", path: ["categoryId"], message: "دسته‌بندی را انتخاب کنید." });
  if (config.source !== "CATEGORY" && config.categoryId) context.addIssue({ code: "custom", path: ["categoryId"], message: "دسته‌بندی فقط برای منبع «یک دسته‌بندی» معنا دارد." });
});
export type ProductListConfig = z.infer<typeof productListConfigSchema>;

export const productListIdPrefix = "PRODUCT_LIST:";
export const productListIdPattern = /^PRODUCT_LIST:[A-Za-z0-9-]{1,80}$/;
export function isProductListId(id: string) {
  return productListIdPattern.test(id);
}
export function newProductListId(uuid: string) {
  return `${productListIdPrefix}${uuid}`;
}

// The general template's three fixed product sections, as they looked before they became product lists.
export const builtInProductLists = {
  FEATURED_PRODUCTS: { layout: "PANEL_SLIDER", title: "شگفت‌انگیز", description: "", moreLabel: productListDefaultMoreLabel, source: "DISCOUNTED", categoryId: null, limit: 12 },
  POPULAR_PRODUCTS: { layout: "SLIDER", title: "محبوب‌ترین کالاها", description: "محصولاتی که بیشتر مورد توجه مشتریان قرار گرفته‌اند", moreLabel: productListDefaultMoreLabel, source: "POPULAR", categoryId: null, limit: 12 },
  LATEST_PRODUCTS: { layout: "SLIDER", title: "جدیدترین محصولات", description: "تازه‌ترین کالاهای اضافه‌شده به فروشگاه", moreLabel: productListDefaultMoreLabel, source: "LATEST", categoryId: null, limit: 12 },
} as const satisfies Record<string, ProductListConfig>;
export type BuiltInProductListId = keyof typeof builtInProductLists;
export function isBuiltInProductListId(id: string): id is BuiltInProductListId {
  return id in builtInProductLists;
}

/** A default configuration for a freshly added list of the chosen layout. */
export function newProductListConfig(layout: ProductListLayout): ProductListConfig {
  return { layout, title: "محصولات", description: "", moreLabel: productListDefaultMoreLabel, source: "LATEST", categoryId: null, limit: productListLayoutMeta[layout].defaultLimit };
}

/**
 * Every product list of the store, by section id: the general template's three built-ins (with whatever was saved over
 * them — including the title/limit the flash-deals section stored before it became a product list) and the lists that
 * were added. The gold template has no built-ins: its latest-products section keeps its own tabbed look.
 */
export function resolveProductLists(stored: unknown, industry: PageBuilderIndustry): Record<string, ProductListConfig> {
  const document = stored && typeof stored === "object" && !Array.isArray(stored) ? (stored as Record<string, unknown>) : {};
  const saved = document.PRODUCT_LISTS && typeof document.PRODUCT_LISTS === "object" && !Array.isArray(document.PRODUCT_LISTS) ? (document.PRODUCT_LISTS as Record<string, unknown>) : {};
  const legacyFeatured = document.FEATURED_PRODUCTS && typeof document.FEATURED_PRODUCTS === "object" ? (document.FEATURED_PRODUCTS as Record<string, unknown>) : {};
  const result: Record<string, ProductListConfig> = {};
  if (industry === "GENERAL") {
    for (const id of Object.keys(builtInProductLists) as BuiltInProductListId[]) {
      const base: ProductListConfig = builtInProductLists[id];
      const overlay = saved[id] && typeof saved[id] === "object" ? saved[id] : id === "FEATURED_PRODUCTS" ? { title: legacyFeatured.title, limit: legacyFeatured.limit } : {};
      const parsed = productListConfigSchema.safeParse({ ...base, ...stripUndefined(overlay as Record<string, unknown>) });
      result[id] = parsed.success ? parsed.data : base;
    }
  }
  for (const [id, value] of Object.entries(saved)) {
    if (!isProductListId(id)) continue;
    const parsed = productListConfigSchema.safeParse(value);
    if (parsed.success) result[id] = parsed.data;
  }
  return result;
}

function stripUndefined(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

/** The display switches of a product list: what its layout is made of, plus the product card's own. */
export function productListDisplayConfig(config: ProductListConfig, industry: PageBuilderIndustry): SectionDisplayConfig {
  const parts: DisplayPart[] = [{ id: "title", label: "عنوان بخش" }, { id: "description", label: "توضیحات بخش" }, { id: "more", label: "نمایش بیشتر" }];
  if (config.layout === "PANEL_SLIDER") {
    parts.unshift({ id: "icon", label: "آیکون" });
    if (config.source === "DISCOUNTED") parts.splice(3, 0, { id: "countdown", label: "شمارنده زمان" });
  }
  // The two ranked layouts: the compact grid and the list mode.
  if (config.layout === "LIST_TWO_COLUMNS" || config.layout === "GRID_COMPACT") parts.push({ id: "rank", label: "شماره رتبه" });
  if (productListLayoutMeta[config.layout].slider) parts.push({ id: "arrows", label: "نمایش فلش‌ها" }, { id: "viewAll", label: "کارت «مشاهده همه»" });
  return { parts: [...parts, ...productCardParts(industry)], master: "layout" };
}

/** Where a product list's "view more" link goes; `categorySlug` is the chosen category's slug when the source is one. */
export function productListMoreHref(config: ProductListConfig, categorySlug: string | null) {
  if (config.source === "POPULAR" || config.source === "BEST_SELLING") return "/products?sortby=popular";
  if (config.source === "LATEST") return "/products?sortby=newest";
  if (config.source === "CATEGORY" && categorySlug) return `/products?category=${categorySlug}`;
  return "/products";
}

/**
 * Drops the switched-off parts of a list that its (new) layout no longer has — changing the layout of a list must not
 * leave behind a switch for, say, arrows the new layout doesn't draw (the display settings would then fail validation).
 */
export function pruneDisplayForList(display: PageDisplay, id: string, config: ProductListConfig, industry: PageBuilderIndustry): PageDisplay {
  const entry = display[id];
  if (!entry) return display;
  const valid = new Set(productListDisplayConfig(config, industry).parts.map((part) => part.id));
  return normalizeDisplay({ ...display, [id]: { ...entry, hiddenParts: entry.hiddenParts.filter((part) => valid.has(part)) } });
}
