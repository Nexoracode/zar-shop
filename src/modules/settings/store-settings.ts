import { cache } from "react";
import { db } from "@/lib/db";
import type { StoreIndustry } from "@generated/prisma/enums";

export const STORE_SETTING_ID = "main";

// `cache` dedupes the read within a single request: the store industry is consulted by the
// layout, the page and several nested server components on every render, and they all want
// the same one row.
export const getStoreIndustry = cache(async (): Promise<StoreIndustry> => {
  const setting = await db.storeSetting.upsert({
    where: { id: STORE_SETTING_ID },
    create: { id: STORE_SETTING_ID, industry: "GOLD" },
    update: {},
    select: { industry: true },
  });
  return setting.industry;
});
