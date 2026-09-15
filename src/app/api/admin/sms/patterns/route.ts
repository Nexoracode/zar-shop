import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getPermittedActor } from "@/modules/auth/session";
import { createSmsPattern, listSmsPatterns, smsPatternInputSchema } from "@/modules/communications/sms-patterns";
import { auditRequestContext } from "@/modules/audit/request-context";

export async function GET() {
  try {
    if (!await getPermittedActor("settings:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    return NextResponse.json(await listSmsPatterns());
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "دریافت پترن‌ها انجام نشد." }, { status: 422 }); }
}

export async function POST(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage"); if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = smsPatternInputSchema.parse(await request.json());
    try {
      const pattern = await createSmsPattern(input);
      await db.auditLog.create({ data: { actorId: actor.id, action: "SMS_PATTERN_CREATE", entityType: "SmsPattern", entityId: pattern.code || null, ...auditRequestContext(request, { text: input.text, category: input.category }) } });
      return NextResponse.json(pattern, { status: 201 });
    } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "ثبت پترن انجام نشد." }, { status: 422 }); }
  } catch (error) { return apiError(error); }
}
