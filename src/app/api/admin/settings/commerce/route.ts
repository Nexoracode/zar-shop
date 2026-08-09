import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { hasPermission } from "@/modules/auth/permissions";
import { getCurrentUser } from "@/modules/auth/session";
import { commerceSettingsSchema, getCommerceSettings } from "@/modules/settings/commerce-settings";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { auditRequestContext } from "@/modules/audit/request-context";

async function orderManager() {
  const actor = await getCurrentUser();
  return actor && hasPermission(actor.role, "orders:manage") ? actor : null;
}

export async function GET() {
  const actor = await orderManager();
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getCommerceSettings());
}

export async function PATCH(request: Request) {
  try {
    const actor = await orderManager();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = commerceSettingsSchema.parse(await request.json());
    await db.$transaction(async (transaction) => {
      await transaction.storeSetting.upsert({ where: { id: STORE_SETTING_ID }, create: { id: STORE_SETTING_ID, ...input }, update: input });
      await transaction.auditLog.create({ data: { actorId: actor.id, action: "COMMERCE_SETTINGS_UPDATE", entityType: "StoreSetting", entityId: STORE_SETTING_ID, ...auditRequestContext(request, input) } });
    });
    return NextResponse.json(await getCommerceSettings());
  } catch (error) { return apiError(error); }
}
