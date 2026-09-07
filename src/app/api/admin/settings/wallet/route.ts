import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { getWalletSettings, walletSettingsSchema } from "@/modules/settings/wallet-settings";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { auditRequestContext } from "@/modules/audit/request-context";

async function settingsManager() {
  const actor = await getCurrentUser();
  return actor && hasPermission(actor.role, "settings:manage") ? actor : null;
}

export async function GET() {
  const actor = await settingsManager();
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getWalletSettings());
}

export async function PATCH(request: Request) {
  try {
    const actor = await settingsManager();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = walletSettingsSchema.parse(await request.json());
    await db.$transaction(async (transaction) => {
      await transaction.storeSetting.upsert({ where: { id: STORE_SETTING_ID }, create: { id: STORE_SETTING_ID, ...input }, update: input });
      await transaction.auditLog.create({ data: { actorId: actor.id, action: "WALLET_SETTINGS_UPDATE", entityType: "StoreSetting", entityId: STORE_SETTING_ID, ...auditRequestContext(request, input) } });
    });
    return NextResponse.json(await getWalletSettings());
  } catch (error) {
    return apiError(error);
  }
}
