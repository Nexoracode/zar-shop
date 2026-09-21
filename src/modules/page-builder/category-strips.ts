import { sectionDisplayConfig, type PageBuilderIndustry, type SectionDisplayConfig } from "@/modules/page-builder/display-parts";
import { categoriesSectionDefaults, categoriesSectionSettingsSchema, type CategoriesSectionSettings } from "@/modules/page-builder/section-settings";

// Category strips added from the page builder: more rows of categories next to the store's own (`CATEGORIES`), each with
// its own title, description, count and order. A strip is a homepage section with the id `CATEGORY_STRIP:<uuid>`, stored
// in `pageSectionSettings.CATEGORY_STRIPS` by that id; its settings are the same as the fixed strip's.

export const categoryStripIdPattern = /^CATEGORY_STRIP:[A-Za-z0-9-]{1,80}$/;
export function isCategoryStripId(id: string) {
  return categoryStripIdPattern.test(id);
}
export function newCategoryStripId(uuid: string) {
  return `CATEGORY_STRIP:${uuid}`;
}

/** The settings of a freshly added strip. */
export function newCategoryStripSettings(): CategoriesSectionSettings {
  return { ...categoriesSectionDefaults };
}

/** The added strips of the store by section id; malformed entries are ignored. */
export function resolveCategoryStrips(stored: unknown): Record<string, CategoriesSectionSettings> {
  const document = stored && typeof stored === "object" && !Array.isArray(stored) ? (stored as Record<string, unknown>) : {};
  const saved = document.CATEGORY_STRIPS && typeof document.CATEGORY_STRIPS === "object" && !Array.isArray(document.CATEGORY_STRIPS) ? (document.CATEGORY_STRIPS as Record<string, unknown>) : {};
  const result: Record<string, CategoriesSectionSettings> = {};
  for (const [id, value] of Object.entries(saved)) {
    if (!isCategoryStripId(id)) continue;
    const parsed = categoriesSectionSettingsSchema.safeParse(value);
    if (parsed.success) result[id] = parsed.data;
  }
  return result;
}

/** The display switches of a strip: the same pieces as the fixed strip's. */
export function categoryStripDisplayConfig(industry: PageBuilderIndustry): SectionDisplayConfig | null {
  return sectionDisplayConfig("CATEGORIES", industry);
}
