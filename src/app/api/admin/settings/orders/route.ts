import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { getOrderSettings, orderSettingsSchema } from "@/modules/settings/order-settings";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

async function orderManager() {
  const actor = await getCurrentUser();
  return actor && hasPermission(actor.role, "orders:manage") ? actor : null;
}

export async function GET() {
  const actor = await orderManager();
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getOrderSettings());
}

export async function PATCH(request: Request) {
  try {
    const actor = await orderManager();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = orderSettingsSchema.parse(await request.json());
    await db.$transaction(async (transaction) => {
      await transaction.storeSetting.upsert({ where: { id: STORE_SETTING_ID }, create: { id: STORE_SETTING_ID, ...input }, update: input });
      await transaction.auditLog.create({ data: { actorId: actor.id, action: "ORDER_SETTINGS_UPDATE", entityType: "StoreSetting", entityId: STORE_SETTING_ID, metadata: input } });
    });
    return NextResponse.json(await getOrderSettings());
  } catch (error) {
    return apiError(error);
  }
}
