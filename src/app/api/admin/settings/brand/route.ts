import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/modules/auth/session";
import { isAdminRole } from "@/modules/auth/permissions";
import { brandSettingsInputSchema, getBrandSettings } from "@/modules/settings/brand-settings";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

export async function GET() {
  const actor = await getCurrentUser();
  if (!actor || !isAdminRole(actor.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getBrandSettings());
}

export async function PATCH(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !isAdminRole(actor.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = brandSettingsInputSchema.parse(await request.json());
    const mediaIds = [...new Set([input.mainLogoMediaId, input.darkLogoMediaId, input.faviconMediaId, input.socialImageMediaId].filter((id): id is string => Boolean(id)))];
    if (mediaIds.length) {
      const media = await db.mediaAsset.findMany({ where: { id: { in: mediaIds }, scope: "BRAND", type: "IMAGE" }, select: { id: true } });
      if (media.length !== mediaIds.length) return NextResponse.json({ message: "یکی از فایل‌های هویت بصری معتبر نیست." }, { status: 422 });
    }
    await db.$transaction(async (tx) => {
      await tx.storeSetting.upsert({ where: { id: STORE_SETTING_ID }, create: { id: STORE_SETTING_ID, ...input }, update: input });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "BRAND_SETTINGS_UPDATE", entityType: "StoreSetting", entityId: STORE_SETTING_ID } });
    });
    return NextResponse.json(await getBrandSettings());
  } catch (error) { return apiError(error); }
}
