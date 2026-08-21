import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { getPermittedActor } from "@/modules/auth/session";
import { getHomepageSettings, homepageMenuSettingsInputSchema, homepageSettingsInputSchema, homepageSettingsToInput } from "@/modules/settings/homepage-settings";
import { getStoreIndustry, STORE_SETTING_ID } from "@/modules/settings/store-settings";

export async function GET() {
  const actor = await getPermittedActor("settings:manage");
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getHomepageSettings());
}

export async function PATCH(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = homepageMenuSettingsInputSchema.parse(await request.json());
    const current = await getHomepageSettings();
    const industry = await getStoreIndustry();
    const generalHomepageSettings = industry === "GENERAL"
      ? homepageSettingsInputSchema.parse({ ...homepageSettingsToInput(current), menuItems: input.menuItems })
      : null;

    await db.$transaction(async (transaction) => {
      if (industry === "GENERAL") {
        await transaction.storeSetting.upsert({
          where: { id: STORE_SETTING_ID },
          create: { id: STORE_SETTING_ID, industry, generalHomepageSettings: generalHomepageSettings! },
          update: { generalHomepageSettings: generalHomepageSettings! },
        });
      } else {
        await transaction.storeSetting.upsert({
          where: { id: STORE_SETTING_ID },
          create: { id: STORE_SETTING_ID, menuCategoryIds: input.menuItems },
          update: { menuCategoryIds: input.menuItems },
        });
      }
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "HOMEPAGE_MENU_SETTINGS_UPDATE",
          entityType: "StoreSetting",
          entityId: STORE_SETTING_ID,
          ...auditRequestContext(request, { menuItems: input.menuItems }),
        },
      });
    });
    return NextResponse.json(await getHomepageSettings());
  } catch (error) {
    return apiError(error);
  }
}
