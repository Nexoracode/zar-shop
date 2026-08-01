import { z } from "zod";
import { db } from "@/lib/db";
import type { UserRole } from "@generated/prisma/enums";
import { adminRoles } from "@/modules/auth/permissions";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

const optionalText = (max: number) => z.union([z.null(), z.string().trim().max(max)]).transform((value) => value || null);

export const generalStoreSettingsSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  tagline: z.string().trim().min(2).max(191),
  shortDescription: z.string().trim().min(10).max(500),
  currency: z.enum(["IRR", "IRT"]),
  timezone: z.literal("Asia/Tehran"),
  supportPhone: optionalText(30),
  supportEmail: z.union([z.null(), z.literal(""), z.email().max(191)]).transform((value) => value || null),
  storeAddress: optionalText(1000),
  legalIdentifier: optionalText(80),
  supportHours: optionalText(191),
  isStoreActive: z.boolean(),
  guestCheckout: z.boolean(),
  maintenanceMode: z.boolean(),
});

export type GeneralStoreSettingsInput = z.infer<typeof generalStoreSettingsSchema>;

export const generalStoreSettingsDefaults: GeneralStoreSettingsInput = {
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

export async function getGeneralStoreSettings(): Promise<GeneralStoreSettingsInput> {
  const existing = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: generalSelect });
  const settings = existing ?? await db.storeSetting.upsert({ where: { id: STORE_SETTING_ID }, create: { id: STORE_SETTING_ID, ...generalStoreSettingsDefaults }, update: {}, select: generalSelect });
  return generalStoreSettingsSchema.parse(settings);
}

export function isStorefrontAvailable(settings: Pick<GeneralStoreSettingsInput, "isStoreActive" | "maintenanceMode">, role?: UserRole | null) {
  return Boolean(role && adminRoles.includes(role)) || (settings.isStoreActive && !settings.maintenanceMode);
}
