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
  // Where parcels ship from. A carrier rate needs an origin, and the free-text store address
  // cannot supply one, so it is picked from the same province/city list addresses use.
  originProvinceId: z.union([z.null(), z.string().cuid()]).default(null),
  originCityId: z.union([z.null(), z.string().cuid()]).default(null),
  // Applied to a product that has no packaged weight, so the cart is never left unpriced.
  defaultParcelWeightGrams: z.coerce.number().int().min(1, "وزن پیش‌فرض بسته باید بیشتر از صفر باشد.").max(500_000, "وزن پیش‌فرض بسته بیش از حد مجاز است."),
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
  originProvinceId: null,
  originCityId: null,
  defaultParcelWeightGrams: 500,
};

const select = {
  onlinePaymentEnabled: true,
  defaultShippingFee: true,
  freeShippingThreshold: true,
  preparationDays: true,
  insuredShippingEnabled: true,
  inStorePickupEnabled: true,
  calculateShippingAfterAddress: true,
  originProvinceId: true,
  originCityId: true,
  defaultParcelWeightGrams: true,
} as const;

export async function getCommerceSettings(): Promise<CommerceSettings> {
  const existing = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select });
  const settings = existing ?? await db.storeSetting.upsert({ where: { id: STORE_SETTING_ID }, create: { id: STORE_SETTING_ID, ...commerceSettingsDefaults }, update: {}, select });
  return commerceSettingsSchema.parse(settings);
}

export function defaultDeliveryMethod(settings: CommerceSettings): "INSURED_SHIPPING" | "STORE_PICKUP" {
  return settings.insuredShippingEnabled ? "INSURED_SHIPPING" : "STORE_PICKUP";
}

/**
 * The fee before any shipping method is chosen — store pickup, a cart over the free-shipping
 * threshold, or a store with no methods configured at all.
 *
 * A chosen method's price comes from `getShippingQuotes` instead; this stays as the floor and
 * the fallback, which is why `freeShippingThreshold` is still checked here and not there.
 */
export function baseShippingFee(settings: CommerceSettings, merchandiseAmount: number, deliveryMethod: "INSURED_SHIPPING" | "STORE_PICKUP") {
  if (deliveryMethod === "STORE_PICKUP") return 0;
  if (settings.freeShippingThreshold !== null && merchandiseAmount >= settings.freeShippingThreshold) return 0;
  return settings.defaultShippingFee;
}

/** True when the cart ships free regardless of which method the customer picks. */
export function qualifiesForFreeShipping(settings: CommerceSettings, merchandiseAmount: number) {
  return settings.freeShippingThreshold !== null && merchandiseAmount >= settings.freeShippingThreshold;
}

export function estimatedReadyAt(preparationDays: number, from = new Date()) {
  return new Date(from.getTime() + preparationDays * 86_400_000);
}
