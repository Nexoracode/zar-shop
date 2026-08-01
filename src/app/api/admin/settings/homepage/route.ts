import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/modules/auth/session";
import { isAdminRole } from "@/modules/auth/permissions";
import { getHomepageSettings, homepageSettingsInputSchema } from "@/modules/settings/homepage-settings";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

export async function GET() {
  const actor = await getCurrentUser();
  if (!actor || !isAdminRole(actor.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getHomepageSettings());
}

export async function PATCH(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !isAdminRole(actor.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = homepageSettingsInputSchema.parse(await request.json());
    const mediaIds = [...new Set([input.heroDesktopMediaId, input.heroMobileMediaId, input.promoDesktopMediaId, input.promoMobileMediaId].filter((id): id is string => Boolean(id)))];
    if (mediaIds.length) {
      const media = await db.mediaAsset.findMany({ where: { id: { in: mediaIds }, scope: "HOMEPAGE", type: "IMAGE" }, select: { id: true } });
      if (media.length !== mediaIds.length) return NextResponse.json({ message: "یکی از تصاویر انتخاب‌شده برای صفحه اصلی معتبر نیست." }, { status: 422 });
    }

    const { sections, ...homepageFields } = input;
    await db.$transaction(async (transaction) => {
      await transaction.storeSetting.upsert({
        where: { id: STORE_SETTING_ID },
        create: { id: STORE_SETTING_ID, ...homepageFields, homepageSections: sections },
        update: { ...homepageFields, homepageSections: sections },
      });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "HOMEPAGE_SETTINGS_UPDATE",
          entityType: "StoreSetting",
          entityId: STORE_SETTING_ID,
          metadata: { sectionOrder: input.sections.map((section) => section.id) },
        },
      });
    });
    return NextResponse.json(await getHomepageSettings());
  } catch (error) {
    return apiError(error);
  }
}
