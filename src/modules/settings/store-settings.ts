import { db } from "@/lib/db";
import type { StoreIndustry } from "@generated/prisma/enums";

export const STORE_SETTING_ID = "main";

export async function getStoreIndustry(): Promise<StoreIndustry> {
  const setting = await db.storeSetting.upsert({
    where: { id: STORE_SETTING_ID },
    create: { id: STORE_SETTING_ID, industry: "GOLD" },
    update: {},
    select: { industry: true },
  });
  return setting.industry;
}
