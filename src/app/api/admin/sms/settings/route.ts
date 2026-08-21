import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getPermittedActor } from "@/modules/auth/session";
import { communicationSettingsSchema, getCommunicationSettings, saveCommunicationSettings } from "@/modules/communications/communication-settings";
import { auditRequestContext } from "@/modules/audit/request-context";

export async function GET() { if (!await getPermittedActor("settings:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 }); return NextResponse.json(await getCommunicationSettings()); }

export async function PATCH(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage"); if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = communicationSettingsSchema.parse(await request.json()); await saveCommunicationSettings(input);
    await db.auditLog.create({ data: { actorId: actor.id, action: "COMMUNICATION_SETTINGS_UPDATE", entityType: "CommunicationSetting", entityId: "main", ...auditRequestContext(request, { changedFields: Object.keys(input) }) } });
    return NextResponse.json(await getCommunicationSettings());
  } catch (error) { return apiError(error); }
}
