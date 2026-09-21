import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { STORE_SETTING_ID, getStoreIndustry } from "@/modules/settings/store-settings";
import { parseStoredSectionSettings, type PageSectionSettingsBundle } from "@/modules/page-builder/section-settings";
import { resolveBannerSliders } from "@/modules/page-builder/banner-sliders";
import { resolveCategoryStrips } from "@/modules/page-builder/category-strips";
import { readDraftSectionIds } from "@/modules/page-builder/draft-sections";
import { resolveProductLists } from "@/modules/page-builder/product-lists";

// Cached across requests like the other settings getters; the save routes clear it with
// `revalidateTag("settings:page-sections")`.
export async function getPageSectionSettings(): Promise<PageSectionSettingsBundle> {
  "use cache";
  cacheLife("hours");
  cacheTag("settings:page-sections");
  const [setting, industry] = await Promise.all([
    db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: { pageSectionSettings: true } }),
    getStoreIndustry(),
  ]);
  return { ...parseStoredSectionSettings(setting?.pageSectionSettings), productLists: resolveProductLists(setting?.pageSectionSettings, industry), bannerSliders: resolveBannerSliders(setting?.pageSectionSettings), categoryStrips: resolveCategoryStrips(setting?.pageSectionSettings), draftSectionIds: readDraftSectionIds(setting?.pageSectionSettings) };
}
