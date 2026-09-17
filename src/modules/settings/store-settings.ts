import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import type { StoreIndustry } from "@generated/prisma/enums";

export const STORE_SETTING_ID = "main";

// Cached across requests — `industry` lives on the same settings row as the general settings
// (it's part of `generalStoreSettingsSchema`), so it shares the "settings:general" tag and is
// cleared by the same `revalidateTag` call in the general settings save route.
export async function getStoreIndustry(): Promise<StoreIndustry> {
  "use cache";
  cacheLife("hours");
  cacheTag("settings:general");
  const setting = await db.storeSetting.upsert({
    where: { id: STORE_SETTING_ID },
    create: { id: STORE_SETTING_ID, industry: "GENERAL" },
    update: {},
    select: { industry: true },
  });
  return setting.industry;
}
