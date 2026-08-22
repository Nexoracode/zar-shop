import { z } from "zod";
import { db } from "@/lib/db";
import type { PhoneOtpPurpose } from "@generated/prisma/enums";
import { decryptSmsCredentials } from "@/modules/communications/sms-config";
import { getCommunicationSettings } from "@/modules/communications/communication-settings";
import { smsAudienceSchema, type SmsAudience } from "@/modules/communications/sms-audiences";

const smsMessageSchema = z.string().trim().min(3).max(500);
export const iranMobileSchema = z.string().trim().transform((value) => value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))).pipe(z.string().regex(/^09\d{9}$/));
export const manualSmsSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("AUDIENCE"), audience: smsAudienceSchema, message: smsMessageSchema }),
  z.object({ mode: z.literal("DIRECT"), phone: iranMobileSchema, message: smsMessageSchema }),
]);

const completedStatuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

function audienceWhere(audience: SmsAudience) {
  const now = Date.now();
  const base = { role: "CUSTOMER" as const, status: "ACTIVE" as const, isGuest: false, smsMarketingConsent: true, phone: { not: null as null } };
  if (audience === "RECENT_30_DAYS") return { ...base, createdAt: { gte: new Date(now - 30 * 86400000) } };
  if (audience === "HAS_ORDERS") return { ...base, orders: { some: { status: { in: [...completedStatuses] } } } };
  if (audience === "NO_ORDERS") return { ...base, orders: { none: {} } };
  if (audience === "PURCHASED_30_DAYS") return { ...base, orders: { some: { status: { in: [...completedStatuses] }, createdAt: { gte: new Date(now - 30 * 86400000) } } } };
  if (audience === "INACTIVE_90_DAYS") return { ...base, OR: [{ lastLoginAt: { lt: new Date(now - 90 * 86400000) } }, { lastLoginAt: null, createdAt: { lt: new Date(now - 90 * 86400000) } }] };
  return base;
}

export async function countSmsAudience(audience: SmsAudience) { return db.user.count({ where: audienceWhere(audience) }); }

function normalizeIranPhone(value: string) {
  const digits = value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/\D/g, "");
  const local = digits.startsWith("0098") ? digits.slice(4) : digits.startsWith("98") ? digits.slice(2) : digits.startsWith("0") ? digits.slice(1) : digits;
  return /^9\d{9}$/.test(local) ? `+98${local}` : null;
}

async function sendWithFaraz(provider: { senderNumber: string; credentialsEncrypted: string }, recipients: string[], message: string) {
  const credentials = z.object({ apiKey: z.string().min(1) }).parse(decryptSmsCredentials(provider.credentialsEncrypted));
  const response = await fetch("https://edge.ippanel.com/v1/api/send", { method: "POST", headers: { "Content-Type": "application/json", Authorization: credentials.apiKey }, body: JSON.stringify({ sending_type: "webservice", from_number: provider.senderNumber, message, params: { recipients } }), signal: AbortSignal.timeout(15000) });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`ارسال پیامک با خطای ${response.status.toLocaleString("fa-IR")} مواجه شد.`);
  return result;
}

export async function sendAutomatedSms(event: "orderCreated" | "paymentSuccess" | "orderShipped" | "orderExpired" | "lowStockAdmin", phone: string | null | undefined, variables: Record<string, string | number>) {
  if (!phone) return false;
  const settings = await getCommunicationSettings();
  const enabled = { orderCreated: settings.orderCreatedSms, paymentSuccess: settings.paymentSuccessSms, orderShipped: settings.orderShippedSms, orderExpired: settings.orderExpiredSms, lowStockAdmin: settings.lowStockAdminSms }[event];
  if (!settings.smsEnabled || !enabled) return false;
  const recipient = normalizeIranPhone(phone); if (!recipient) return false;
  const provider = await db.smsProviderConfig.findFirst({ where: { isActive: true, provider: "FARAZ_SMS" } }); if (!provider) return false;
  const message = settings.templates[event].replace(/\{([A-Za-z]+)\}/g, (token, key: string) => key in variables ? String(variables[key]) : token);
  const campaign = await db.smsCampaign.create({ data: { provider: provider.provider, audience: `SYSTEM_${event.toUpperCase()}`, message, recipientCount: 1, status: "SENDING" } });
  try { const result = await sendWithFaraz(provider, [recipient], message); await db.smsCampaign.update({ where: { id: campaign.id }, data: { status: "SENT", successfulCount: 1, providerData: result ?? undefined } }); return true; }
  catch (error) { await db.smsCampaign.update({ where: { id: campaign.id }, data: { status: "FAILED", failedCount: 1, errorMessage: error instanceof Error ? error.message : "خطای ناشناخته" } }); return false; }
}

const otpMessages: Record<PhoneOtpPurpose, (code: string) => string> = {
  REGISTER: (code) => `کد تأیید ثبت‌نام شما: ${code}\nاین کد تا ۱۰ دقیقه دیگر معتبر است.`,
  LOGIN: (code) => `کد ورود شما: ${code}\nاین کد تا ۱۰ دقیقه دیگر معتبر است.`,
  RESET_PASSWORD: (code) => `کد بازیابی رمز عبور شما: ${code}\nاین کد تا ۱۰ دقیقه دیگر معتبر است.`,
};

// Unlike sendAutomatedSms, this ignores the per-event marketing/notification toggles: every
// OTP purpose here is a security-critical, flow-blocking transactional message that must go
// out whenever the SMS channel itself is on, not gated behind an "order shipped" style switch.
export async function sendPhoneOtpCode(phone: string | null | undefined, code: string, purpose: PhoneOtpPurpose) {
  if (!phone) return false;
  const settings = await getCommunicationSettings();
  if (!settings.smsEnabled) return false;
  const recipient = normalizeIranPhone(phone); if (!recipient) return false;
  const provider = await db.smsProviderConfig.findFirst({ where: { isActive: true, provider: "FARAZ_SMS" } }); if (!provider) return false;
  const message = otpMessages[purpose](code);
  const campaign = await db.smsCampaign.create({ data: { provider: provider.provider, audience: `SYSTEM_PHONE_OTP_${purpose}`, message, recipientCount: 1, status: "SENDING" } });
  try { const result = await sendWithFaraz(provider, [recipient], message); await db.smsCampaign.update({ where: { id: campaign.id }, data: { status: "SENT", successfulCount: 1, providerData: result ?? undefined } }); return true; }
  catch (error) { await db.smsCampaign.update({ where: { id: campaign.id }, data: { status: "FAILED", failedCount: 1, errorMessage: error instanceof Error ? error.message : "خطای ناشناخته" } }); return false; }
}

export async function sendManualSms(input: z.infer<typeof manualSmsSchema>, actorId: string) {
  const provider = await db.smsProviderConfig.findFirst({ where: { isActive: true, provider: "FARAZ_SMS" } });
  if (!provider) throw new Error("ابتدا فراز اس‌ام‌اس را پیکربندی و فعال کنید.");
  const recipients = input.mode === "DIRECT" ? [normalizeIranPhone(input.phone)!] : await db.user.findMany({ where: audienceWhere(input.audience), select: { phone: true }, orderBy: { createdAt: "desc" }, take: 1000 }).then((users) => [...new Set(users.flatMap((user) => user.phone ? [normalizeIranPhone(user.phone)] : []).filter((phone): phone is string => Boolean(phone)))]);
  if (!recipients.length) throw new Error("برای این فیلتر مخاطب واجد شرایطی پیدا نشد.");
  const campaign = await db.smsCampaign.create({ data: { actorId, provider: provider.provider, audience: input.mode === "DIRECT" ? "SPECIFIC_PHONE" : input.audience, message: input.message, recipientCount: recipients.length, status: "SENDING" } });
  try {
    const result = await sendWithFaraz(provider, recipients, input.message);
    await db.smsCampaign.update({ where: { id: campaign.id }, data: { status: "SENT", successfulCount: recipients.length, providerData: result ?? undefined } });
    return { campaignId: campaign.id, recipientCount: recipients.length };
  } catch (error) {
    await db.smsCampaign.update({ where: { id: campaign.id }, data: { status: "FAILED", failedCount: recipients.length, errorMessage: error instanceof Error ? error.message : "خطای ناشناخته" } });
    throw error;
  }
}
