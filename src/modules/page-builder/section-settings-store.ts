import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { parseStoredSectionSettings, type PageSectionSettings } from "@/modules/page-builder/section-settings";

// Cached across requests like the other settings getters; the save route clears it with
// `revalidateTag("settings:page-sections")`.
export async function getPageSectionSettings(): Promise<PageSectionSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag("settings:page-sections");
  const setting = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: { pageSectionSettings: true } });
  return parseStoredSectionSettings(setting?.pageSectionSettings);
}
