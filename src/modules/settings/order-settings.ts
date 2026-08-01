import { z } from "zod";
import { db } from "@/lib/db";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

export const orderSettingsSchema = z.object({
  orderExpirationEnabled: z.boolean(),
  orderExpirationMinutes: z.coerce.number().int().min(1).max(1440),
  orderWarningMinutes: z.coerce.number().int().min(0).max(1439),
  orderExpirationStart: z.enum(["CREATED_AT", "PAYMENT_STARTED_AT"]),
  orderExpirationAction: z.enum(["EXPIRE", "CANCEL", "NOTIFY"]),
  showOrderCountdown: z.boolean(),
  releaseReservedInventory: z.boolean(),
  restorePromotionOnExpiry: z.boolean(),
  minimumOrderAmount: z.coerce.number().int().min(0).max(999_999_999_999_999),
  orderNumberPrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,10}$/),
  maxOrderItemQuantity: z.coerce.number().int().min(1).max(100),
  revalidateGoldAtCheckout: z.boolean(),
}).superRefine((settings, context) => {
  if (settings.orderWarningMinutes >= settings.orderExpirationMinutes) {
    context.addIssue({ code: "custom", path: ["orderWarningMinutes"], message: "زمان هشدار باید کمتر از زمان انقضا باشد." });
  }
});

export type OrderSettings = z.infer<typeof orderSettingsSchema>;

export const orderSettingsDefaults: OrderSettings = {
  orderExpirationEnabled: true,
  orderExpirationMinutes: 15,
  orderWarningMinutes: 5,
  orderExpirationStart: "CREATED_AT",
  orderExpirationAction: "EXPIRE",
  showOrderCountdown: true,
  releaseReservedInventory: true,
  restorePromotionOnExpiry: true,
  minimumOrderAmount: 5_000_000,
  orderNumberPrefix: "ZG",
  maxOrderItemQuantity: 5,
  revalidateGoldAtCheckout: true,
};

const select = {
  orderExpirationEnabled: true,
  orderExpirationMinutes: true,
  orderWarningMinutes: true,
  orderExpirationStart: true,
  orderExpirationAction: true,
  showOrderCountdown: true,
  releaseReservedInventory: true,
  restorePromotionOnExpiry: true,
  minimumOrderAmount: true,
  orderNumberPrefix: true,
  maxOrderItemQuantity: true,
  revalidateGoldAtCheckout: true,
} as const;

export async function getOrderSettings(): Promise<OrderSettings> {
  const existing = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select });
  const settings = existing ?? await db.storeSetting.upsert({
    where: { id: STORE_SETTING_ID },
    create: { id: STORE_SETTING_ID, ...orderSettingsDefaults },
    update: {},
    select,
  });
  return orderSettingsSchema.parse(settings);
}

export function orderExpiresAt(settings: OrderSettings, startedAt: Date) {
  if (!settings.orderExpirationEnabled) return null;
  return new Date(startedAt.getTime() + settings.orderExpirationMinutes * 60_000);
}
