import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { activeProviderInputSchema, encryptSmsCredentials, getPublicSmsProviderConfigs, maskSmsCredential } from "@/modules/communications/sms-config";
import { smsProviderInfo, smsProviderInputSchema, smsProviderSchema } from "@/modules/communications/sms-providers";

async function admin() { const actor = await getCurrentUser(); return actor?.role === "ADMIN" ? actor : null; }

export async function GET() {
  if (!await admin()) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getPublicSmsProviderConfigs());
}

export async function POST(request: Request) {
  try {
    const actor = await admin(); if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = smsProviderInputSchema.parse(await request.json()); const info = smsProviderInfo(input.provider);
    const credentials = input.provider === "FARAZ_SMS" ? { apiKey: input.apiKey } : { username: input.username, password: input.password };
    const maskSource = input.provider === "FARAZ_SMS" ? input.apiKey : input.username;
    await db.$transaction(async (tx) => {
      const item = await tx.smsProviderConfig.upsert({ where: { provider: input.provider }, create: { provider: input.provider, displayName: info.name, credentialsEncrypted: encryptSmsCredentials(credentials), credentialMasked: maskSmsCredential(maskSource), senderNumber: input.senderNumber }, update: { displayName: info.name, credentialsEncrypted: encryptSmsCredentials(credentials), credentialMasked: maskSmsCredential(maskSource), senderNumber: input.senderNumber } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "SMS_PROVIDER_CONFIG_UPSERT", entityType: "SmsProviderConfig", entityId: item.id, metadata: { provider: input.provider } } });
    });
    return NextResponse.json(await getPublicSmsProviderConfigs(), { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await admin(); if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { provider } = activeProviderInputSchema.parse(await request.json());
    if (!smsProviderInfo(provider).sendSupported) return NextResponse.json({ message: "قرارداد API عمومی این ارائه‌دهنده هنوز در پروژه ثبت نشده است." }, { status: 422 });
    const existing = await db.smsProviderConfig.findUnique({ where: { provider } });
    if (!existing) return NextResponse.json({ message: "ارائه‌دهنده ابتدا باید پیکربندی شود." }, { status: 404 });
    await db.$transaction(async (tx) => { await tx.smsProviderConfig.updateMany({ data: { isActive: false } }); await tx.smsProviderConfig.update({ where: { provider }, data: { isActive: true } }); await tx.auditLog.create({ data: { actorId: actor.id, action: "SMS_PROVIDER_ACTIVATE", entityType: "SmsProviderConfig", entityId: existing.id, metadata: { provider } } }); });
    return NextResponse.json(await getPublicSmsProviderConfigs());
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const actor = await admin(); if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const provider = smsProviderSchema.parse(new URL(request.url).searchParams.get("provider"));
    const existing = await db.smsProviderConfig.findUnique({ where: { provider } });
    if (!existing) return NextResponse.json({ message: "ارائه‌دهنده پیدا نشد." }, { status: 404 });
    await db.$transaction(async (tx) => { await tx.smsProviderConfig.delete({ where: { provider } }); await tx.auditLog.create({ data: { actorId: actor.id, action: "SMS_PROVIDER_CONFIG_DELETE", entityType: "SmsProviderConfig", entityId: existing.id, metadata: { provider } } }); });
    return NextResponse.json(await getPublicSmsProviderConfigs());
  } catch (error) { return apiError(error); }
}
