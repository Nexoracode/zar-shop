import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import type { UserRole } from "@generated/prisma/enums";
import { adminRoles } from "@/modules/auth/permissions";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { generalSettingsFieldLimits } from "@/modules/settings/settings-limits";

const optionalText = (max: number) => z.union([z.null(), z.string().trim().max(max)]).transform((value) => value || null);

export const generalStoreSettingsSchema = z.object({
  industry: z.enum(["GOLD", "GENERAL"]),
  storeName: z.string().trim().min(2).max(generalSettingsFieldLimits.storeName),
  tagline: z.string().trim().min(2).max(generalSettingsFieldLimits.tagline),
  shortDescription: z.string().trim().min(10).max(generalSettingsFieldLimits.shortDescription),
  currency: z.enum(["IRR", "IRT"]),
  timezone: z.literal("Asia/Tehran"),
  supportPhone: optionalText(generalSettingsFieldLimits.supportPhone),
  supportEmail: z.union([z.null(), z.literal(""), z.email().max(generalSettingsFieldLimits.supportEmail)]).transform((value) => value || null),
  storeAddress: optionalText(generalSettingsFieldLimits.storeAddress),
  legalIdentifier: optionalText(generalSettingsFieldLimits.legalIdentifier),
  supportHours: optionalText(generalSettingsFieldLimits.supportHours),
  isStoreActive: z.boolean(),
  guestCheckout: z.boolean(),
  maintenanceMode: z.boolean(),
});

export const generalStoreSettingsUpdateSchema = generalStoreSettingsSchema.omit({ industry: true });

export type GeneralStoreSettingsInput = z.infer<typeof generalStoreSettingsSchema>;

export const generalStoreSettingsDefaults: GeneralStoreSettingsInput = {
  industry: "GENERAL",
  storeName: "زر گالری",
  tagline: "طلا، روایت ماندگار شما",
  shortDescription: "فروش آنلاین زیورآلات طلای ۱۸ عیار با قیمت روز و فاکتور رسمی",
  currency: "IRR",
  timezone: "Asia/Tehran",
  supportPhone: "۰۲۱-۰۰۰۰۰۰۰۰",
  supportEmail: "support@zargallery.ir",
  storeAddress: null,
  legalIdentifier: null,
  supportHours: "شنبه تا پنجشنبه، ۹ تا ۱۸",
  isStoreActive: true,
  guestCheckout: true,
  maintenanceMode: false,
};

const generalSelect = {
  setupCompletedAt: true,
  industry: true,
  storeName: true,
  tagline: true,
  shortDescription: true,
  currency: true,
  timezone: true,
  supportPhone: true,
  supportEmail: true,
  storeAddress: true,
  legalIdentifier: true,
  supportHours: true,
  isStoreActive: true,
  guestCheckout: true,
  maintenanceMode: true,
} as const;

export type GeneralStoreSettings = GeneralStoreSettingsInput & {
  // `false` until the first-run setup wizard is finished. Carried on the settings object so
  // every `isStorefrontAvailable` call site enforces it without an extra query of its own.
  setupComplete: boolean;
};

// Cached across requests (not just within one) — the root layout, `generateMetadata` and most
// pages read the general store settings. `revalidateTag("settings:general")` in the settings
// save route clears this the moment an admin updates it.
export async function getGeneralStoreSettings(): Promise<GeneralStoreSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag("settings:general");
  const existing = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: generalSelect });
  const settings = existing ?? await db.storeSetting.upsert({ where: { id: STORE_SETTING_ID }, create: { id: STORE_SETTING_ID, ...generalStoreSettingsDefaults }, update: {}, select: generalSelect });
  return { ...generalStoreSettingsSchema.parse(settings), setupComplete: Boolean(settings.setupCompletedAt) };
}

export function isStorefrontAvailable(
  settings: Pick<GeneralStoreSettings, "isStoreActive" | "maintenanceMode"> & Partial<Pick<GeneralStoreSettings, "setupComplete">>,
  role?: UserRole | null,
) {
  // Until the first-run setup wizard is finished the storefront is closed to everyone, admins
  // included — there is nothing sellable yet and the owner is told to finish setup first.
  if (settings.setupComplete === false) return false;
  return Boolean(role && adminRoles.includes(role)) || (settings.isStoreActive && !settings.maintenanceMode);
}
