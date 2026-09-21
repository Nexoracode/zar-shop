import { z } from "zod";
import { pageSectionLimits } from "@/modules/settings/settings-limits";

// Content settings of individual storefront sections, edited from the page builder's "edit" dialog — what a section
// says and how many/which items it lists, as opposed to the display switches in `display-parts.ts`. Each section that
// has some has its own schema and defaults here; only values that differ from the defaults are stored.

export const categoriesSortValues = ["MANUAL", "NAME", "MOST_PRODUCTS"] as const;
export type CategoriesSort = (typeof categoriesSortValues)[number];
export const categoriesSortLabels: Record<CategoriesSort, string> = {
  MANUAL: "ترتیب تعیین‌شده در مدیریت",
  NAME: "حروف الفبا",
  MOST_PRODUCTS: "بیشترین تعداد کالا",
};

export const categoriesSectionSettingsSchema = z.object({
  title: z.string().trim()
    .min(2, "عنوان بخش باید حداقل ۲ نویسه باشد.")
    .max(pageSectionLimits.categoriesTitle, `عنوان بخش نباید بیشتر از ${pageSectionLimits.categoriesTitle.toLocaleString("fa-IR")} نویسه باشد.`),
  limit: z.number({ error: "تعداد نمایش را به‌صورت عدد وارد کنید." })
    .int("تعداد نمایش باید عدد صحیح باشد.")
    .min(pageSectionLimits.categoriesMin, `تعداد نمایش باید حداقل ${pageSectionLimits.categoriesMin.toLocaleString("fa-IR")} باشد.`)
    .max(pageSectionLimits.categoriesMax, `تعداد نمایش نباید بیشتر از ${pageSectionLimits.categoriesMax.toLocaleString("fa-IR")} باشد.`),
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

export type PageSectionSettings = { categories: CategoriesSectionSettings };

/** Lenient read of the stored document: whatever is missing or malformed falls back to the section's defaults. */
export function parseStoredSectionSettings(value: unknown): PageSectionSettings {
  const stored = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const categories = categoriesSectionSettingsSchema.safeParse({ ...categoriesSectionDefaults, ...(stored.CATEGORIES && typeof stored.CATEGORIES === "object" ? stored.CATEGORIES : {}) });
  return { categories: categories.success ? categories.data : categoriesSectionDefaults };
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
