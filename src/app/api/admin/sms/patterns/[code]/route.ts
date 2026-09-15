import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getPermittedActor } from "@/modules/auth/session";
import { deleteSmsPattern, smsPatternInputSchema, updateSmsPattern } from "@/modules/communications/sms-patterns";
import { auditRequestContext } from "@/modules/audit/request-context";

export async function PUT(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const actor = await getPermittedActor("settings:manage"); if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { code } = await params;
    const input = smsPatternInputSchema.parse(await request.json());
    try {
      const pattern = await updateSmsPattern(code, input);
      await db.auditLog.create({ data: { actorId: actor.id, action: "SMS_PATTERN_UPDATE", entityType: "SmsPattern", entityId: code, ...auditRequestContext(request, { text: input.text }) } });
      return NextResponse.json(pattern);
    } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "ویرایش پترن انجام نشد." }, { status: 422 }); }
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const actor = await getPermittedActor("settings:manage"); if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { code } = await params;
    try {
      await deleteSmsPattern(code);
      await db.auditLog.create({ data: { actorId: actor.id, action: "SMS_PATTERN_DELETE", entityType: "SmsPattern", entityId: code, ...auditRequestContext(request, { code }) } });
      return new NextResponse(null, { status: 204 });
    } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "حذف پترن انجام نشد." }, { status: 422 }); }
  } catch (error) { return apiError(error); }
}
