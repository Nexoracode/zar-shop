import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { getPermittedActor } from "@/modules/auth/session";
import { getHomepageSettings, homepageLayoutSettingsInputSchema, homepageSettingsInputSchema, homepageSettingsToInput, homepageTilesSettingsInputSchema } from "@/modules/settings/homepage-settings";
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
    const input = homepageLayoutSettingsInputSchema.parse(await request.json());
    const current = await getHomepageSettings();
    homepageTilesSettingsInputSchema.parse({ sections: input.sections, tileGroups: homepageSettingsToInput(current).tileGroups });
    const industry = await getStoreIndustry();
    const generalHomepageSettings = industry === "GENERAL"
      ? homepageSettingsInputSchema.parse({ ...homepageSettingsToInput(current), sections: input.sections })
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
          create: { id: STORE_SETTING_ID, homepageSections: input.sections },
          update: { homepageSections: input.sections },
        });
      }
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "HOMEPAGE_LAYOUT_SETTINGS_UPDATE",
          entityType: "StoreSetting",
          entityId: STORE_SETTING_ID,
          ...auditRequestContext(request, { sectionOrder: input.sections.map((section) => section.id), enabledSections: input.sections.filter((section) => section.enabled).map((section) => section.id) }),
        },
      });
    });
    return NextResponse.json(await getHomepageSettings());
  } catch (error) {
    return apiError(error);
  }
}
