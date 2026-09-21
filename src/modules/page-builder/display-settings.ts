import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { parseStoredDisplay, type PageDisplay } from "@/modules/page-builder/display-parts";

// Cached across requests like the other settings getters; the save route clears it with
// `revalidateTag("settings:page-display")`.
export async function getPageDisplaySettings(): Promise<PageDisplay> {
  "use cache";
  cacheLife("hours");
  cacheTag("settings:page-display");
  const setting = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: { pageDisplaySettings: true } });
  return parseStoredDisplay(setting?.pageDisplaySettings);
}
