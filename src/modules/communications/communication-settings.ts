import { z } from "zod";
import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { normalizeNumericValue } from "@/lib/persian-numbers";
import { communicationFieldLimits } from "@/modules/communications/limits";
import { smsEventRulesSchema } from "@/modules/communications/sms-events";

const templateText = z.string().trim().max(communicationFieldLimits.template);

export const communicationTemplatesSchema = z.object({
  orderCreated: templateText.default("سفارش {orderNumber} ثبت شد."),
  paymentSuccess: templateText.default("پرداخت سفارش {orderNumber} با موفقیت انجام شد."),
  orderProcessing: templateText.default("سفارش {orderNumber} در حال آماده‌سازی است."),
  orderShipped: templateText.default("سفارش {orderNumber} تحویل شرکت حمل شد."),
  orderDelivered: templateText.default("سفارش {orderNumber} تحویل شد. از خرید شما سپاسگزاریم."),
  orderExpired: templateText.default("مهلت پرداخت سفارش {orderNumber} به پایان رسید."),
  orderCancelled: templateText.default("سفارش {orderNumber} لغو شد."),
  orderRefunded: templateText.default("وجه سفارش {orderNumber} بازگشت داده شد."),
  lowStockAdmin: templateText.default("موجودی محصول {productName} به {stock} رسید."),
});

export const communicationSettingsSchema = z.object({
  smsEnabled: z.boolean(), inAppEnabled: z.boolean(), adminPhone: z.string().trim().max(communicationFieldLimits.adminPhone).nullable(),
  orderCreatedSms: z.boolean(), paymentSuccessSms: z.boolean(), orderShippedSms: z.boolean(), orderExpiredSms: z.boolean(), lowStockAdminSms: z.boolean(),
  orderProcessingSms: z.boolean().default(false), orderDeliveredSms: z.boolean().default(false), orderCancelledSms: z.boolean().default(false), orderRefundedSms: z.boolean().default(false),
  templates: communicationTemplatesSchema,
  eventRules: smsEventRulesSchema.default({}),
});

export type CommunicationSettingsData = z.infer<typeof communicationSettingsSchema>;

/**
 * What a form may send: only the fields it owns. The channels form and the events form save
 * separately, so each sends its own slice and the rest of the row stays as it is on the server —
 * a full-object save from one page would otherwise overwrite what the other just stored.
 */
export const communicationSettingsPatchSchema = z.object({
  smsEnabled: z.boolean(), inAppEnabled: z.boolean(),
  // The number that receives admin alerts must be a real mobile: it is normalized (Persian digits) and checked here, not just in the form.
  adminPhone: z.string().trim().transform((value) => normalizeNumericValue(value, false)).pipe(z.string().regex(/^09\d{9}$/, "شماره موبایل باید به‌صورت 09xxxxxxxxx باشد.")).nullable(),
  orderCreatedSms: z.boolean(), paymentSuccessSms: z.boolean(), orderProcessingSms: z.boolean(), orderShippedSms: z.boolean(), orderDeliveredSms: z.boolean(), orderExpiredSms: z.boolean(), orderCancelledSms: z.boolean(), orderRefundedSms: z.boolean(), lowStockAdminSms: z.boolean(),
  templates: z.object({
    orderCreated: templateText, paymentSuccess: templateText, orderProcessing: templateText, orderShipped: templateText, orderDelivered: templateText, orderExpired: templateText, orderCancelled: templateText, orderRefunded: templateText, lowStockAdmin: templateText,
  }).partial(),
  eventRules: smsEventRulesSchema,
}).partial();

export type CommunicationSettingsPatch = z.infer<typeof communicationSettingsPatchSchema>;

const defaults = communicationSettingsSchema.parse({ smsEnabled: false, inAppEnabled: true, adminPhone: null, orderCreatedSms: false, paymentSuccessSms: true, orderShippedSms: true, orderExpiredSms: false, lowStockAdminSms: false, templates: {} });

export async function getCommunicationSettings(): Promise<CommunicationSettingsData> {
  const item = await db.communicationSetting.findUnique({ where: { id: "main" } });
  if (!item) return defaults;
  // A stored rule that no longer fits the schema falls back to "no rules" (plain text) rather than taking every SMS down with it.
  const eventRules = smsEventRulesSchema.safeParse(item.eventRules ?? {});
  return communicationSettingsSchema.parse({ ...item, templates: item.templates ?? {}, eventRules: eventRules.success ? eventRules.data : {} });
}

export async function saveCommunicationSettings(patch: CommunicationSettingsPatch) {
  const current = await getCommunicationSettings();
  const next: CommunicationSettingsData = { ...current, ...patch, templates: { ...current.templates, ...patch.templates }, eventRules: { ...current.eventRules, ...patch.eventRules } };
  const data = { ...next, eventRules: next.eventRules as unknown as Prisma.InputJsonObject };
  return db.communicationSetting.upsert({ where: { id: "main" }, create: { id: "main", ...data }, update: data });
}
