import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { countSmsAudience, manualSmsSchema, sendManualSms } from "@/modules/communications/sms-service";
import { smsAudienceSchema } from "@/modules/communications/sms-audiences";

async function admin() { const actor = await getCurrentUser(); return actor?.role === "ADMIN" ? actor : null; }

export async function GET(request: Request) {
  if (!await admin()) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  const value = new URL(request.url).searchParams.get("audience");
  if (value) { const audience = smsAudienceSchema.safeParse(value); if (!audience.success) return NextResponse.json({ message: "فیلتر مخاطب معتبر نیست." }, { status: 422 }); return NextResponse.json({ count: await countSmsAudience(audience.data) }); }
  return NextResponse.json(await db.smsCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 20 }));
}

export async function POST(request: Request) {
  try {
    const actor = await admin(); if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = manualSmsSchema.parse(await request.json());
    try {
      const result = await sendManualSms(input, actor.id);
      await db.auditLog.create({ data: { actorId: actor.id, action: "MANUAL_SMS_SEND", entityType: "SmsCampaign", entityId: result.campaignId, metadata: { audience: input.audience, recipientCount: result.recipientCount } } });
      return NextResponse.json(result, { status: 201 });
    } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "ارسال پیامک انجام نشد." }, { status: 422 }); }
  } catch (error) { return apiError(error); }
}
