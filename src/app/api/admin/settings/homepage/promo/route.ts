import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { isAdminRole } from "@/modules/auth/permissions";
import { getCurrentUser } from "@/modules/auth/session";
import { getHomepageSettings, homepagePromoSettingsInputSchema, homepageSettingsInputSchema, homepageSettingsToInput } from "@/modules/settings/homepage-settings";
import { getStoreIndustry, STORE_SETTING_ID } from "@/modules/settings/store-settings";

export async function GET() {
  const actor = await getCurrentUser();
  if (!actor || !isAdminRole(actor.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getHomepageSettings());
}

export async function PATCH(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !isAdminRole(actor.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = homepagePromoSettingsInputSchema.parse(await request.json());
    const mediaIds = [...new Set([input.promoDesktopMediaId, input.promoMobileMediaId].filter((id): id is string => Boolean(id)))];
    if (mediaIds.length) {
      const media = await db.mediaAsset.findMany({ where: { id: { in: mediaIds }, scope: "HOMEPAGE", type: "IMAGE" }, select: { id: true } });
      if (media.length !== mediaIds.length) return NextResponse.json({ message: "یکی از تصاویر انتخاب‌شده برای پروموبنر معتبر نیست." }, { status: 422 });
    }
    const current = await getHomepageSettings();
    const industry = await getStoreIndustry();
    const generalHomepageSettings = industry === "GENERAL"
      ? homepageSettingsInputSchema.parse({ ...homepageSettingsToInput(current), ...input })
      : null;

    await db.$transaction(async (transaction) => {
      if (industry === "GENERAL") {
        await transaction.storeSetting.upsert({ where: { id: STORE_SETTING_ID }, create: { id: STORE_SETTING_ID, industry, generalHomepageSettings: generalHomepageSettings! }, update: { generalHomepageSettings: generalHomepageSettings! } });
      } else {
        await transaction.storeSetting.upsert({ where: { id: STORE_SETTING_ID }, create: { id: STORE_SETTING_ID, ...input }, update: input });
      }
      await transaction.auditLog.create({
        data: { actorId: actor.id, action: "HOMEPAGE_PROMO_SETTINGS_UPDATE", entityType: "StoreSetting", entityId: STORE_SETTING_ID, ...auditRequestContext(request, input) },
      });
    });
    return NextResponse.json(await getHomepageSettings());
  } catch (error) {
    return apiError(error);
  }
}
