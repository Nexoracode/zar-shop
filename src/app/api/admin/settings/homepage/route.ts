import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/modules/auth/session";
import { isAdminRole } from "@/modules/auth/permissions";
import { getHomepageSettings, homepageMainSettingsInputSchema, homepageSettingsInputSchema, homepageSettingsToInput } from "@/modules/settings/homepage-settings";
import { getStoreIndustry, STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { auditRequestContext } from "@/modules/audit/request-context";

export async function GET() {
  const actor = await getCurrentUser();
  if (!actor || !isAdminRole(actor.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getHomepageSettings());
}

export async function PATCH(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !isAdminRole(actor.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = homepageMainSettingsInputSchema.parse(await request.json());
    const mediaIds = [...new Set([
      input.promoDesktopMediaId,
      input.promoMobileMediaId,
      ...input.treasureCards.map((card) => card.mediaId),
      ...input.licenses.map((license) => license.mediaId),
    ].filter((id): id is string => Boolean(id)))];
    if (mediaIds.length) {
      const media = await db.mediaAsset.findMany({ where: { id: { in: mediaIds }, scope: "HOMEPAGE", type: "IMAGE" }, select: { id: true } });
      if (media.length !== mediaIds.length) return NextResponse.json({ message: "یکی از تصاویر انتخاب‌شده برای صفحه اصلی معتبر نیست." }, { status: 422 });
    }

    const industry = await getStoreIndustry();
    const { treasureCards, licenses, ...homepageFields } = input;
    const current = await getHomepageSettings();
    const generalHomepageSettings = industry === "GENERAL"
      ? homepageSettingsInputSchema.parse({ ...homepageSettingsToInput(current), ...input })
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
          create: { id: STORE_SETTING_ID, ...homepageFields, homepageTreasureCards: treasureCards, homepageLicenses: licenses },
          update: { ...homepageFields, homepageTreasureCards: treasureCards, homepageLicenses: licenses },
        });
      }
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "HOMEPAGE_SETTINGS_UPDATE",
          entityType: "StoreSetting",
          entityId: STORE_SETTING_ID,
          ...auditRequestContext(request, { treasureMediaIds: treasureCards.map((card) => card.mediaId), licenseMediaIds: licenses.map((license) => license.mediaId) }),
        },
      });
    });
    return NextResponse.json(await getHomepageSettings());
  } catch (error) {
    return apiError(error);
  }
}
