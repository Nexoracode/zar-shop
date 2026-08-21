import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getPermittedActor } from "@/modules/auth/session";
import { generalStoreSettingsSchema, generalStoreSettingsUpdateSchema, getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { auditRequestContext } from "@/modules/audit/request-context";

export async function GET() {
  const actor = await getPermittedActor("settings:manage");
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getGeneralStoreSettings());
}

export async function PATCH(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = generalStoreSettingsUpdateSchema.parse(await request.json());
    const settings = await db.$transaction(async (transaction) => {
      const saved = await transaction.storeSetting.upsert({
        where: { id: STORE_SETTING_ID },
        create: { id: STORE_SETTING_ID, ...input },
        update: input,
      });
      await transaction.auditLog.create({
        data: { actorId: actor.id, action: "GENERAL_SETTINGS_UPDATE", entityType: "StoreSetting", entityId: STORE_SETTING_ID, ...auditRequestContext(request, { changedFields: Object.keys(input) }) },
      });
      return saved;
    });
    return NextResponse.json(generalStoreSettingsSchema.parse(settings));
  } catch (error) {
    return apiError(error);
  }
}
