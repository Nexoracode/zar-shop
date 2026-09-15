import { z } from "zod";
import { db } from "@/lib/db";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

// Mirrors `content-settings.ts`: Zod schema → type, single `StoreSetting` JSON column, defaults
// derived by parsing `{}` (every field has a `.default()`).
export const seoSettingsSchema = z.object({
  metaTitle: z.string().trim().max(120).default(""),
  metaDescription: z.string().trim().max(320).default(""),
  canonicalDomain: z.url("دامنه باید یک آدرس کامل مانند https://example.ir باشد.").max(100).default("https://zargallery.ir"),
  allowIndexing: z.boolean().default(true),
  enableProductSchema: z.boolean().default(true),
});

export type SeoSettings = z.infer<typeof seoSettingsSchema>;

export const seoSettingsDefaults: SeoSettings = seoSettingsSchema.parse({});

const select = { seoSettings: true } as const;

export async function getSeoSettings(): Promise<SeoSettings> {
  const row = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select });
  const parsed = seoSettingsSchema.safeParse(row?.seoSettings ?? {});
  return parsed.success ? parsed.data : seoSettingsDefaults;
}
