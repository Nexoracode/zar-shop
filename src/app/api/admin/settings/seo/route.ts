import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getPermittedActor } from "@/modules/auth/session";
import { getSeoSettings, seoSettingsSchema } from "@/modules/settings/seo-settings";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { auditRequestContext } from "@/modules/audit/request-context";
import { revalidateSitemap } from "@/modules/seo/revalidate";

export async function GET() {
  const actor = await getPermittedActor("settings:manage");
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getSeoSettings());
}

export async function PATCH(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = seoSettingsSchema.parse(await request.json());
    await db.$transaction(async (transaction) => {
      await transaction.storeSetting.upsert({
        where: { id: STORE_SETTING_ID },
        create: { id: STORE_SETTING_ID, seoSettings: input },
        update: { seoSettings: input },
      });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "SEO_SETTINGS_UPDATE",
          entityType: "StoreSetting",
          entityId: STORE_SETTING_ID,
          ...auditRequestContext(request, { changedFields: Object.keys(input) }),
        },
      });
    });
    revalidateSitemap();
    return NextResponse.json(await getSeoSettings());
  } catch (error) {
    return apiError(error);
  }
}
