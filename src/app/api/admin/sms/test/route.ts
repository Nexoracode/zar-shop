import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getPermittedActor } from "@/modules/auth/session";
import { auditRequestContext } from "@/modules/audit/request-context";
import { FarazApiError } from "@/modules/communications/faraz-client";
import { sendSmsTest, smsTestSchema } from "@/modules/communications/sms-service";

export async function POST(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage"); if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = smsTestSchema.parse(await request.json());
    try {
      const result = await sendSmsTest(input);
      await db.auditLog.create({ data: { actorId: actor.id, action: "SMS_TEST_SEND", entityType: "SmsProviderConfig", entityId: null, ...auditRequestContext(request, { kind: input.kind, sendRequestId: result.sendRequestId }) } });
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof FarazApiError) return NextResponse.json({ message: error.message }, { status: 422 });
      throw error;
    }
  } catch (error) { return apiError(error); }
}
