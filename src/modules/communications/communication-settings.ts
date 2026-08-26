import { z } from "zod";
import { db } from "@/lib/db";
import { communicationFieldLimits } from "@/modules/communications/limits";

export const communicationTemplatesSchema = z.object({
  orderCreated: z.string().trim().max(500).default("سفارش {orderNumber} ثبت شد."),
  paymentSuccess: z.string().trim().max(500).default("پرداخت سفارش {orderNumber} با موفقیت انجام شد."),
  orderShipped: z.string().trim().max(500).default("سفارش {orderNumber} تحویل شرکت حمل شد."),
  orderExpired: z.string().trim().max(500).default("مهلت پرداخت سفارش {orderNumber} به پایان رسید."),
  lowStockAdmin: z.string().trim().max(500).default("موجودی محصول {productName} به {stock} رسید."),
});

export const communicationSettingsSchema = z.object({
  smsEnabled: z.boolean(), inAppEnabled: z.boolean(), adminPhone: z.string().trim().max(communicationFieldLimits.adminPhone).nullable(),
  orderCreatedSms: z.boolean(), paymentSuccessSms: z.boolean(), orderShippedSms: z.boolean(), orderExpiredSms: z.boolean(), lowStockAdminSms: z.boolean(),
  templates: communicationTemplatesSchema,
});

export type CommunicationSettingsData = z.infer<typeof communicationSettingsSchema>;
const defaults = communicationSettingsSchema.parse({ smsEnabled: false, inAppEnabled: true, adminPhone: null, orderCreatedSms: false, paymentSuccessSms: true, orderShippedSms: true, orderExpiredSms: false, lowStockAdminSms: false, templates: {} });

export async function getCommunicationSettings(): Promise<CommunicationSettingsData> {
  const item = await db.communicationSetting.findUnique({ where: { id: "main" } });
  if (!item) return defaults;
  return communicationSettingsSchema.parse({ ...item, templates: item.templates ?? {} });
}

export async function saveCommunicationSettings(input: CommunicationSettingsData) {
  return db.communicationSetting.upsert({ where: { id: "main" }, create: { id: "main", ...input }, update: input });
}
