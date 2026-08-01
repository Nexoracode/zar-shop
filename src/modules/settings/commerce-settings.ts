import { z } from "zod";
import { db } from "@/lib/db";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

export const commerceSettingsSchema = z.object({
  onlinePaymentEnabled: z.boolean(),
  defaultShippingFee: z.coerce.number().int().min(0).max(999_999_999_999_999),
  freeShippingThreshold: z.union([z.null(), z.coerce.number().int().min(1).max(999_999_999_999_999)]),
  preparationDays: z.coerce.number().int().min(0).max(90),
  insuredShippingEnabled: z.boolean(),
  inStorePickupEnabled: z.boolean(),
  calculateShippingAfterAddress: z.boolean(),
}).superRefine((settings, context) => {
  if (!settings.insuredShippingEnabled && !settings.inStorePickupEnabled) {
    context.addIssue({ code: "custom", path: ["insuredShippingEnabled"], message: "حداقل یک روش تحویل باید فعال باشد." });
  }
});

export type CommerceSettings = z.infer<typeof commerceSettingsSchema>;

export const commerceSettingsDefaults: CommerceSettings = {
  onlinePaymentEnabled: true,
  defaultShippingFee: 0,
  freeShippingThreshold: 100_000_000,
  preparationDays: 2,
  insuredShippingEnabled: true,
  inStorePickupEnabled: true,
  calculateShippingAfterAddress: true,
};

const select = {
  onlinePaymentEnabled: true,
  defaultShippingFee: true,
  freeShippingThreshold: true,
  preparationDays: true,
  insuredShippingEnabled: true,
  inStorePickupEnabled: true,
  calculateShippingAfterAddress: true,
} as const;

export async function getCommerceSettings(): Promise<CommerceSettings> {
  const existing = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select });
  const settings = existing ?? await db.storeSetting.upsert({ where: { id: STORE_SETTING_ID }, create: { id: STORE_SETTING_ID, ...commerceSettingsDefaults }, update: {}, select });
  return commerceSettingsSchema.parse(settings);
}

export function baseShippingFee(settings: CommerceSettings, merchandiseAmount: number, deliveryMethod: "INSURED_SHIPPING" | "STORE_PICKUP") {
  if (deliveryMethod === "STORE_PICKUP") return 0;
  if (settings.freeShippingThreshold !== null && merchandiseAmount >= settings.freeShippingThreshold) return 0;
  return settings.defaultShippingFee;
}

export function estimatedReadyAt(preparationDays: number, from = new Date()) {
  return new Date(from.getTime() + preparationDays * 86_400_000);
}
