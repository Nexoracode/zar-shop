import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { getCatalogSettings, parseCatalogSettingsUpdate } from "@/modules/settings/catalog-settings";
import { getStoreIndustry, STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { auditRequestContext } from "@/modules/audit/request-context";

async function catalogManager() {
  const actor = await getCurrentUser();
  return actor && hasPermission(actor.role, "catalog:manage") ? actor : null;
}

export async function GET() {
  const actor = await catalogManager();
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getCatalogSettings());
}

export async function PATCH(request: Request) {
  try {
    const actor = await catalogManager();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const industry = await getStoreIndustry();
    const input = parseCatalogSettingsUpdate(industry, await request.json());
    await db.$transaction(async (transaction) => {
      await transaction.storeSetting.upsert({
        where: { id: STORE_SETTING_ID },
        create: { id: STORE_SETTING_ID, industry, ...input },
        update: input,
      });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "CATALOG_SETTINGS_UPDATE",
          entityType: "StoreSetting",
          entityId: STORE_SETTING_ID,
          ...auditRequestContext(request, { industry, ...input }),
        },
      });
    });
    return NextResponse.json(await getCatalogSettings());
  } catch (error) {
    return apiError(error);
  }
}
