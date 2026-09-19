import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getPermittedActor } from "@/modules/auth/session";
import { activeProviderInputSchema, encryptSmsCredentials, getPublicSmsProviderConfigs, getStoredFarazCredentials, maskSmsCredential } from "@/modules/communications/sms-config";
import { smsProviderInfo, smsProviderInputSchema, smsProviderSchema } from "@/modules/communications/sms-providers";
import { auditRequestContext } from "@/modules/audit/request-context";

export async function GET() {
  if (!await getPermittedActor("settings:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getPublicSmsProviderConfigs());
}

export async function POST(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage"); if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = smsProviderInputSchema.parse(await request.json()); const info = smsProviderInfo(input.provider);
    // An edit may leave the key blank to keep the stored one; a first save has nothing to fall back to.
    const apiKey = input.provider === "FARAZ_SMS" ? input.apiKey || (await getStoredFarazCredentials())?.apiKey : undefined;
    if (input.provider === "FARAZ_SMS" && !apiKey) return NextResponse.json({ message: "اطلاعات ارسال‌شده معتبر نیست.", issues: { apiKey: ["API Key را وارد کنید."] } }, { status: 422 });
    const credentials = input.provider === "FARAZ_SMS" ? { apiKey, otpPatternCode: input.otpPatternCode, otpCodeVariable: input.otpCodeVariable, otpNameVariable: input.otpNameVariable || undefined } : { username: input.username, password: input.password };
    const maskSource = input.provider === "FARAZ_SMS" ? apiKey! : input.username;
    await db.$transaction(async (tx) => {
      // A config activates itself when nothing else (no *other* provider) is active — otherwise
      // saving it silently does nothing (sendPhoneOtpCode only ever looks at the active provider)
      // and the admin has no reason to expect a second "فعال‌سازی" step on another page. Re-saving
      // an already-inactive row (e.g. after fixing a typo) must activate it too, not just a
      // brand-new one, so this checks for any *other* active provider rather than any at all.
      const otherActive = info.sendSupported ? await tx.smsProviderConfig.findFirst({ where: { isActive: true, provider: { not: input.provider } } }) : null;
      const isActive = info.sendSupported && !otherActive;
      const item = await tx.smsProviderConfig.upsert({ where: { provider: input.provider }, create: { provider: input.provider, displayName: info.name, credentialsEncrypted: encryptSmsCredentials(credentials), credentialMasked: maskSmsCredential(maskSource), senderNumber: input.senderNumber, isActive }, update: { displayName: info.name, credentialsEncrypted: encryptSmsCredentials(credentials), credentialMasked: maskSmsCredential(maskSource), senderNumber: input.senderNumber, isActive } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "SMS_PROVIDER_CONFIG_UPSERT", entityType: "SmsProviderConfig", entityId: item.id, ...auditRequestContext(request, { provider: input.provider, senderNumber: input.senderNumber }) } });
    });
    return NextResponse.json(await getPublicSmsProviderConfigs(), { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage"); if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { provider, isActive } = activeProviderInputSchema.parse(await request.json());
    if (isActive && !smsProviderInfo(provider).sendSupported) return NextResponse.json({ message: "قرارداد API عمومی این ارائه‌دهنده هنوز در پروژه ثبت نشده است." }, { status: 422 });
    const existing = await db.smsProviderConfig.findUnique({ where: { provider } });
    if (!existing) return NextResponse.json({ message: "ارائه‌دهنده ابتدا باید پیکربندی شود." }, { status: 404 });
    await db.$transaction(async (tx) => {
      // Activating makes this the only active provider; deactivating just switches this one off.
      if (isActive) await tx.smsProviderConfig.updateMany({ data: { isActive: false } });
      await tx.smsProviderConfig.update({ where: { provider }, data: { isActive } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: isActive ? "SMS_PROVIDER_ACTIVATE" : "SMS_PROVIDER_DEACTIVATE", entityType: "SmsProviderConfig", entityId: existing.id, ...auditRequestContext(request, { provider }) } });
    });
    return NextResponse.json(await getPublicSmsProviderConfigs());
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage"); if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const provider = smsProviderSchema.parse(new URL(request.url).searchParams.get("provider"));
    const existing = await db.smsProviderConfig.findUnique({ where: { provider } });
    if (!existing) return NextResponse.json({ message: "ارائه‌دهنده پیدا نشد." }, { status: 404 });
    await db.$transaction(async (tx) => { await tx.smsProviderConfig.delete({ where: { provider } }); await tx.auditLog.create({ data: { actorId: actor.id, action: "SMS_PROVIDER_CONFIG_DELETE", entityType: "SmsProviderConfig", entityId: existing.id, ...auditRequestContext(request, { provider }) } }); });
    return NextResponse.json(await getPublicSmsProviderConfigs());
  } catch (error) { return apiError(error); }
}
