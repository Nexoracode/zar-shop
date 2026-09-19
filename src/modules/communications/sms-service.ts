import { z } from "zod";
import { db } from "@/lib/db";
import type { PhoneOtpPurpose } from "@generated/prisma/enums";
import { decryptSmsCredentials, getStoredFarazCredentials } from "@/modules/communications/sms-config";
import { getCommunicationSettings } from "@/modules/communications/communication-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { smsAudienceSchema, type SmsAudience } from "@/modules/communications/sms-audiences";
import { smsFieldLimits } from "@/modules/communications/limits";
import { buildPatternAttributes, renderSmsTemplate, smsEventFlagKey, smsEventInfo, smsEventRule, type SmsEventId } from "@/modules/communications/sms-events";
import { FarazApiError, sendRequestIdOf } from "@/modules/communications/faraz-client";
import { normalizeIranPhone, sendFarazPatternSms, sendFarazSampleSms, sendFarazSimpleSms } from "@/modules/communications/faraz-messaging";

const smsMessageSchema = z.string().trim().min(3).max(smsFieldLimits.message);
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

function farazApiKeyOf(provider: { credentialsEncrypted: string }) {
  return z.object({ apiKey: z.string().min(1) }).parse(decryptSmsCredentials(provider.credentialsEncrypted)).apiKey;
}

// Free-text sends go through Faraz's "simple" endpoint, which holds every message for operator
// approval before it goes out (see faraz-messaging.ts).
async function sendWithFaraz(provider: { senderNumber: string; credentialsEncrypted: string }, recipients: string[], message: string) {
  return sendFarazSimpleSms(farazApiKeyOf(provider), provider.senderNumber, recipients, message);
}

// OTP codes go through Faraz SMS's registered-pattern API instead of the free-text "simple"
// endpoint above: carriers in Iran require verification codes to use a pre-approved pattern so
// they aren't filtered as advertising (and unlike the simple endpoint, pattern sends aren't
// held for human moderation). The pattern code, line number and attribute names are all per-store
// (each Faraz SMS account approves its own pattern with whatever variable names the admin chose),
// so `attributes` arrives pre-built from the admin-configured provider rather than assuming any
// fixed variable names here — purpose-specific copy isn't possible here, that only lives in the
// SmsCampaign audit record via otpMessages below.
function sendWithFarazPattern(apiKey: string, patternCode: string, lineNumber: string, recipient: string, attributes: Record<string, string>) {
  return sendFarazPatternSms(apiKey, { patternCode, lineNumber, recipient, attributes });
}

// The values an event's message can use. Callers only know the order number (or product); the
// customer's name, the amount and the tracking number are read from the order here so no caller
// has to load them just to feed an SMS.
async function resolveEventValues(event: SmsEventId, given: Record<string, string | number>) {
  const general = await getGeneralStoreSettings();
  const values: Record<string, string> = { storeName: general.storeName };
  for (const [name, value] of Object.entries(given)) values[name] = String(value);
  const wanted: readonly string[] = smsEventInfo(event).variables;
  if (values.orderNumber && ["customerName", "totalAmount", "trackingNumber"].some((name) => wanted.includes(name) && !(name in values))) {
    const order = await db.order.findUnique({ where: { orderNumber: values.orderNumber }, select: { total: true, trackingNumber: true, user: { select: { firstName: true, lastName: true } } } });
    if (order) {
      values.customerName ??= [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || "مشتری گرامی";
      // Amounts are stored in rials; the store shows them in its configured currency.
      values.totalAmount ??= String(Math.round(Number(order.total) / (general.currency === "IRT" ? 10 : 1)));
      values.trackingNumber ??= order.trackingNumber ?? "-";
    }
  }
  return values;
}

/**
 * An event goes out either as free text (held by Faraz for operator approval) or through the
 * registered pattern the admin bound to it (instant). Both respect the channel switch and the
 * event's own on/off switch.
 */
export async function sendAutomatedSms(event: SmsEventId, phone: string | null | undefined, variables: Record<string, string | number>) {
  if (!phone) return false;
  const settings = await getCommunicationSettings();
  if (!settings.smsEnabled || !settings[smsEventFlagKey(event)]) return false;
  const recipient = normalizeIranPhone(phone); if (!recipient) return false;
  const provider = await db.smsProviderConfig.findFirst({ where: { isActive: true, provider: "FARAZ_SMS" } }); if (!provider) return false;
  const values = await resolveEventValues(event, variables);
  const rule = smsEventRule(settings.eventRules, event);
  const attributes = rule.mode === "PATTERN" && rule.patternCode ? buildPatternAttributes(rule.bindings, values) : null;
  const message = attributes ? `پترن ${rule.patternCode}: ${Object.entries(attributes).map(([name, value]) => `${name}=${value}`).join("، ")}` : renderSmsTemplate(settings.templates[event], values);
  const campaign = await db.smsCampaign.create({ data: { provider: provider.provider, audience: `SYSTEM_${event.toUpperCase()}`, message, recipientCount: 1, status: "SENDING" } });
  try {
    const result = attributes
      ? await sendWithFarazPattern(farazApiKeyOf(provider), rule.patternCode, provider.senderNumber, recipient, attributes)
      : await sendWithFaraz(provider, [recipient], message);
    await db.smsCampaign.update({ where: { id: campaign.id }, data: { status: "SENT", successfulCount: 1, providerData: result ?? undefined } });
    return true;
  } catch (error) { await db.smsCampaign.update({ where: { id: campaign.id }, data: { status: "FAILED", failedCount: 1, errorMessage: error instanceof Error ? error.message : "خطای ناشناخته" } }); return false; }
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
  const credentials = z.object({ apiKey: z.string().min(1), otpPatternCode: z.string().min(1), otpCodeVariable: z.string().min(1), otpNameVariable: z.string().optional() }).parse(decryptSmsCredentials(provider.credentialsEncrypted));
  const storeName = (await getGeneralStoreSettings()).storeName;
  const message = otpMessages[purpose](code);
  const attributes: Record<string, string> = { [credentials.otpCodeVariable]: code };
  if (credentials.otpNameVariable) attributes[credentials.otpNameVariable] = storeName;
  const campaign = await db.smsCampaign.create({ data: { provider: provider.provider, audience: `SYSTEM_PHONE_OTP_${purpose}`, message, recipientCount: 1, status: "SENDING" } });
  try { const result = await sendWithFarazPattern(credentials.apiKey, credentials.otpPatternCode, provider.senderNumber, recipient, attributes); await db.smsCampaign.update({ where: { id: campaign.id }, data: { status: "SENT", successfulCount: 1, providerData: result ?? undefined } }); return true; }
  catch (error) { await db.smsCampaign.update({ where: { id: campaign.id }, data: { status: "FAILED", failedCount: 1, errorMessage: error instanceof Error ? error.message : "خطای ناشناخته" } }); return false; }
}

export const smsTestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("SAMPLE") }),
  z.object({ kind: z.literal("PATTERN"), phone: iranMobileSchema }),
]);

// A configuration check, not customer traffic: it runs against the *saved* Faraz config even when
// it is not the active provider yet, ignores the "sending enabled" switch, and leaves no campaign
// record (the route writes an audit entry instead).
export async function sendSmsTest(input: z.infer<typeof smsTestSchema>) {
  const stored = await getStoredFarazCredentials();
  if (!stored) throw new FarazApiError("ابتدا فراز اس‌ام‌اس را پیکربندی و ذخیره کنید.", 422);
  const storeName = (await getGeneralStoreSettings()).storeName;
  if (input.kind === "SAMPLE") {
    const result = await sendFarazSampleSms(stored.apiKey, stored.senderNumber, `پیامک آزمایشی ${storeName}: اتصال به فراز اس‌ام‌اس برقرار است.`);
    return { sendRequestId: sendRequestIdOf(result) };
  }
  if (!stored.otp) throw new FarazApiError("پترن کد تأیید هنوز در پیکربندی ثبت نشده است.", 422);
  const attributes: Record<string, string> = { [stored.otp.codeVariable]: "12345" };
  if (stored.otp.nameVariable) attributes[stored.otp.nameVariable] = storeName;
  const result = await sendFarazPatternSms(stored.apiKey, { patternCode: stored.otp.patternCode, lineNumber: stored.senderNumber, recipient: normalizeIranPhone(input.phone) ?? input.phone, attributes });
  return { sendRequestId: sendRequestIdOf(result) };
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
