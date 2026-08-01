import { z } from "zod";
import type { StoreIndustry } from "@generated/prisma/enums";
import { db } from "@/lib/db";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

export const catalogCommonSettingsSchema = z.object({
  catalogLowStockThreshold: z.coerce.number().int().min(0).max(10_000),
  catalogPageSize: z.coerce.number().int().min(4).max(100),
  hideOutOfStockProducts: z.boolean(),
  showProductStock: z.boolean(),
});

export const goldCatalogSettingsSchema = catalogCommonSettingsSchema.extend({
  goldPriceRefreshSeconds: z.coerce.number().int().min(15).max(3_600),
  goldPriceCacheSeconds: z.coerce.number().int().min(15).max(3_600),
  goldPriceFallbackMinutes: z.coerce.number().int().min(1).max(1_440),
});

const catalogSettingsSchema = goldCatalogSettingsSchema.extend({
  industry: z.enum(["GOLD", "GENERAL"]),
});

export type CatalogCommonSettings = z.infer<typeof catalogCommonSettingsSchema>;
export type GoldCatalogSettings = z.infer<typeof goldCatalogSettingsSchema>;
export type CatalogSettings = z.infer<typeof catalogSettingsSchema>;

export const catalogSettingsDefaults: Omit<CatalogSettings, "industry"> = {
  catalogLowStockThreshold: 3,
  catalogPageSize: 24,
  hideOutOfStockProducts: true,
  showProductStock: true,
  goldPriceRefreshSeconds: 60,
  goldPriceCacheSeconds: 120,
  goldPriceFallbackMinutes: 15,
};

const select = {
  industry: true,
  catalogLowStockThreshold: true,
  catalogPageSize: true,
  hideOutOfStockProducts: true,
  showProductStock: true,
  goldPriceRefreshSeconds: true,
  goldPriceCacheSeconds: true,
  goldPriceFallbackMinutes: true,
} as const;

export async function getCatalogSettings(): Promise<CatalogSettings> {
  const existing = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select });
  const settings = existing ?? await db.storeSetting.upsert({
    where: { id: STORE_SETTING_ID },
    create: { id: STORE_SETTING_ID, ...catalogSettingsDefaults },
    update: {},
    select,
  });
  return catalogSettingsSchema.parse(settings);
}

export function parseCatalogSettingsUpdate(industry: StoreIndustry, input: unknown) {
  return industry === "GOLD"
    ? goldCatalogSettingsSchema.parse(input)
    : catalogCommonSettingsSchema.parse(input);
}
