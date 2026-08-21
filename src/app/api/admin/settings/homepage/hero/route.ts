import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getPermittedActor } from "@/modules/auth/session";
import { getHomepageSettings, homepageHeroSettingsInputSchema, homepageSettingsInputSchema, homepageSettingsToInput } from "@/modules/settings/homepage-settings";
import { getStoreIndustry, STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { auditRequestContext } from "@/modules/audit/request-context";

export async function GET() {
  const actor = await getPermittedActor("settings:manage");
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getHomepageSettings());
}

export async function PATCH(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = homepageHeroSettingsInputSchema.parse(await request.json());
    const mediaIds = [...new Set([
      input.heroDesktopMediaId,
      input.heroMobileMediaId,
      ...input.heroSlides.flatMap((slide) => [slide.desktopMediaId, slide.mobileMediaId]),
    ].filter((id): id is string => Boolean(id)))];

    if (mediaIds.length) {
      const media = await db.mediaAsset.findMany({
        where: { id: { in: mediaIds }, scope: "HOMEPAGE", type: "IMAGE" },
        select: { id: true },
      });
      if (media.length !== mediaIds.length) return NextResponse.json({ message: "یکی از تصاویر انتخاب‌شده برای هیرو معتبر نیست." }, { status: 422 });
    }

    const industry = await getStoreIndustry();
    const { heroSlides, ...heroFields } = input;
    const generalHomepageSettings = industry === "GENERAL"
      ? homepageSettingsInputSchema.parse({ ...homepageSettingsToInput(await getHomepageSettings()), ...input })
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
          create: { id: STORE_SETTING_ID, ...heroFields, homepageHeroSlides: heroSlides },
          update: { ...heroFields, homepageHeroSlides: heroSlides },
        });
      }
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "HOMEPAGE_HERO_SETTINGS_UPDATE",
          entityType: "StoreSetting",
          entityId: STORE_SETTING_ID,
          ...auditRequestContext(request, { heroSlideCount: heroSlides.length }),
        },
      });
    });

    return NextResponse.json(await getHomepageSettings());
  } catch (error) {
    return apiError(error);
  }
}
