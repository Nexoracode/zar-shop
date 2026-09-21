import { z } from "zod";
import type { BannerSliderConfig } from "@/modules/page-builder/banner-sliders";
import type { ProductListConfig } from "@/modules/page-builder/product-lists";
import { pageSectionLimits } from "@/modules/settings/settings-limits";

// Content settings of individual storefront sections, edited from the page builder's "edit" dialog — what a section
// says and how many/which items it lists, as opposed to the display switches in `display-parts.ts`. Each section that
// has some has its own schema and defaults here; only values that differ from the defaults are stored.

const titleSchema = (max: number) => z.string().trim()
  .min(2, "عنوان بخش باید حداقل ۲ نویسه باشد.")
  .max(max, `عنوان بخش نباید بیشتر از ${max.toLocaleString("fa-IR")} نویسه باشد.`);

const countSchema = (min: number, max: number) => z.number({ error: "تعداد نمایش را به‌صورت عدد وارد کنید." })
  .int("تعداد نمایش باید عدد صحیح باشد.")
  .min(min, `تعداد نمایش باید حداقل ${min.toLocaleString("fa-IR")} باشد.`)
  .max(max, `تعداد نمایش نباید بیشتر از ${max.toLocaleString("fa-IR")} باشد.`);

// ---- the homepage category strip
export const categoriesSortValues = ["MANUAL", "NAME", "MOST_PRODUCTS"] as const;
export type CategoriesSort = (typeof categoriesSortValues)[number];
export const categoriesSortLabels: Record<CategoriesSort, string> = {
  MANUAL: "ترتیب تعیین‌شده در مدیریت",
  NAME: "حروف الفبا",
  MOST_PRODUCTS: "بیشترین تعداد کالا",
};

export const categoriesSectionSettingsSchema = z.object({
  title: titleSchema(pageSectionLimits.title),
  limit: countSchema(pageSectionLimits.categoriesMin, pageSectionLimits.categoriesMax),
  sort: z.enum(categoriesSortValues, { error: "ترتیب نمایش را انتخاب کنید." }),
});
export type CategoriesSectionSettings = z.infer<typeof categoriesSectionSettingsSchema>;

// The homepage's category strip as it was before it became editable (a fixed title and the first ten categories).
export const categoriesSectionDefaults: CategoriesSectionSettings = { title: "خرید بر اساس دسته‌بندی", limit: 10, sort: "MANUAL" };

/** The sections that have content settings, by the id the builder and the storage use. */
export const sectionSettingsSchemas = { CATEGORIES: categoriesSectionSettingsSchema } as const;
export type SectionSettingsId = keyof typeof sectionSettingsSchemas;
export function isSectionSettingsId(id: string): id is SectionSettingsId {
  return id in sectionSettingsSchemas;
}

export type PageSectionSettings = { CATEGORIES: CategoriesSectionSettings };
export const sectionSettingsDefaults: PageSectionSettings = { CATEGORIES: categoriesSectionDefaults };

/** The fixed sections' settings plus every product list of the store (by section id). */
export type PageSectionSettingsBundle = PageSectionSettings & { productLists: Record<string, ProductListConfig>; /** The banner sets added from the page builder (sliders and tile looks), by section id. */ bannerSliders: Record<string, BannerSliderConfig>; /** Added sections that are still drafts: not part of the page until a layout containing them is saved. */ draftSectionIds: string[] };

/** The form fields of a section's edit dialog, in order (text ones full width, the others two to a row). */
export type ContentField = { /** Hide the field while this says so (e.g. the category picker unless the source is a category). */ visibleWhen?: (values: Record<string, string>) => boolean } & (
  | { name: string; kind: "text"; label: string; maxLength: number; /** Not required (no asterisk); an empty value is allowed. */ optional?: boolean }
  | { name: string; kind: "richtext"; label: string; /** Visible characters allowed. */ maxLength: number; hint?: string }
  | { name: string; kind: "number"; label: string; max: number; hint?: string }
  | { name: string; kind: "select"; label: string; options: { value: string; label: string }[]; /** An empty first choice with this wording (otherwise a value is always selected). */ placeholder?: string; searchable?: boolean }
);

export const sectionContentFields: Record<SectionSettingsId, ContentField[]> = {
  CATEGORIES: [
    { name: "title", kind: "text", label: "عنوان بخش", maxLength: pageSectionLimits.title },
    { name: "limit", kind: "number", label: "تعداد نمایش", max: pageSectionLimits.categoriesMax, hint: `حداکثر ${pageSectionLimits.categoriesMax.toLocaleString("fa-IR")} دسته` },
    { name: "sort", kind: "select", label: "ترتیب نمایش", options: categoriesSortValues.map((value) => ({ value, label: categoriesSortLabels[value] })) },
  ],
};

/** Lenient read of the stored document: whatever is missing or malformed falls back to the section's defaults. */
export function parseStoredSectionSettings(value: unknown): PageSectionSettings {
  const stored = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const result = { ...sectionSettingsDefaults } as Record<SectionSettingsId, unknown>;
  for (const id of Object.keys(sectionSettingsSchemas) as SectionSettingsId[]) {
    const own = stored[id] && typeof stored[id] === "object" ? (stored[id] as object) : {};
    const parsed = sectionSettingsSchemas[id].safeParse({ ...sectionSettingsDefaults[id], ...own });
    if (parsed.success) result[id] = parsed.data;
  }
  return result as PageSectionSettings;
}

/**
 * The categories the strip shows: `items` (already in the administrator's order) arranged as `sort` says and cut to
 * `limit`. Sorting by product count keeps the administrator's order among equal counts.
 */
export function arrangeCategories<T extends { name: string; _count: { products: number } }>(items: T[], { sort, limit }: Pick<CategoriesSectionSettings, "sort" | "limit">): T[] {
  const arranged = [...items];
  if (sort === "NAME") arranged.sort((a, b) => a.name.localeCompare(b.name, "fa"));
  else if (sort === "MOST_PRODUCTS") arranged.sort((a, b) => b._count.products - a._count.products);
  return arranged.slice(0, limit);
}
