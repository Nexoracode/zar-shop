import { NextResponse } from "next/server";
import type { Prisma } from "@generated/prisma/client";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { getPermittedActor } from "@/modules/auth/session";
import { commitDraftSections } from "@/modules/page-builder/draft-sections";
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

    let committedDrafts = false;
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
      // The sections added in the page builder become part of the page with the layout that contains them.
      const stored = await transaction.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: { pageSectionSettings: true } });
      const commit = commitDraftSections(stored?.pageSectionSettings, input.sections.map((section) => section.id));
      if (commit.committed.length) {
        await transaction.storeSetting.update({ where: { id: STORE_SETTING_ID }, data: { pageSectionSettings: commit.stored as Prisma.InputJsonObject } });
        committedDrafts = true;
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
    // { expire: 0 } because the response below re-reads the cached getter immediately.
    revalidateTag("settings:homepage", { expire: 0 });
    if (committedDrafts) revalidateTag("settings:page-sections", { expire: 0 });
    return NextResponse.json(await getHomepageSettings());
  } catch (error) {
    return apiError(error);
  }
}
