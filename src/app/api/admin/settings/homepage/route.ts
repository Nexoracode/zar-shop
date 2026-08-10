import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/modules/auth/session";
import { isAdminRole } from "@/modules/auth/permissions";
import { getHomepageSettings, homepageOverviewSettingsInputSchema, homepageSettingsInputSchema, homepageSettingsToInput } from "@/modules/settings/homepage-settings";
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
    const input = homepageOverviewSettingsInputSchema.parse(await request.json());
    if (input.menuCategoryIds.length) {
      const categories = await db.category.findMany({
        where: { id: { in: input.menuCategoryIds }, isActive: true, parentId: null },
        select: { id: true },
      });
      if (categories.length !== input.menuCategoryIds.length) {
        return NextResponse.json({ message: "یکی از دسته‌های انتخاب‌شده برای منوی بالا معتبر یا فعال نیست." }, { status: 422 });
      }
    }
    const mediaIds = [...new Set([
      input.promoDesktopMediaId,
      input.promoMobileMediaId,
      ...input.treasureCards.map((card) => card.mediaId),
      ...input.licenses.map((license) => license.mediaId),
      ...input.tileGroups.flatMap((group) => group.tiles.map((tile) => tile.mediaId)),
    ].filter((id): id is string => Boolean(id)))];
    if (mediaIds.length) {
      const media = await db.mediaAsset.findMany({ where: { id: { in: mediaIds }, scope: "HOMEPAGE", type: "IMAGE" }, select: { id: true } });
      if (media.length !== mediaIds.length) return NextResponse.json({ message: "یکی از تصاویر انتخاب‌شده برای صفحه اصلی معتبر نیست." }, { status: 422 });
    }

    const industry = await getStoreIndustry();
    const { sections, tileGroups, treasureCards, licenses, ...homepageFields } = input;
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
          create: { id: STORE_SETTING_ID, ...homepageFields, homepageSections: sections, homepageTileGroups: tileGroups, homepageTreasureCards: treasureCards, homepageLicenses: licenses },
          update: { ...homepageFields, homepageSections: sections, homepageTileGroups: tileGroups, homepageTreasureCards: treasureCards, homepageLicenses: licenses },
        });
      }
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "HOMEPAGE_SETTINGS_UPDATE",
          entityType: "StoreSetting",
          entityId: STORE_SETTING_ID,
          ...auditRequestContext(request, { sectionOrder: input.sections.map((section) => section.id), menuCategoryIds: input.menuCategoryIds, tileGroups: tileGroups.map((group) => ({ id: group.id, layout: group.layout, tiles: group.tiles.map((tile) => ({ id: tile.id, mediaId: tile.mediaId, href: tile.href })) })), treasureMediaIds: treasureCards.map((card) => card.mediaId), licenseMediaIds: licenses.map((license) => license.mediaId) }),
        },
      });
    });
    return NextResponse.json(await getHomepageSettings());
  } catch (error) {
    return apiError(error);
  }
}
