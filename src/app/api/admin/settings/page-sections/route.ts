import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { getPermittedActor } from "@/modules/auth/session";
import { sanitizeSectionDescription } from "@/modules/page-builder/rich-text-sanitize";
import { isSectionSettingsId, sectionSettingsSchemas } from "@/modules/page-builder/section-settings";
import { getPageSectionSettings } from "@/modules/page-builder/section-settings-store";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

export async function GET() {
  const actor = await getPermittedActor("settings:manage");
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getPageSectionSettings());
}

// Saves the content settings of one section: `{ sectionId, settings }`. The other sections' stored settings are kept.
export async function PATCH(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { sectionId, settings } = z.object({ sectionId: z.string().refine(isSectionSettingsId, "این بخش تنظیمات محتوا ندارد."), settings: z.unknown() }).parse(await request.json());
    const validated = sectionSettingsSchemas[sectionId as keyof typeof sectionSettingsSchemas].parse(settings);
    // A description is HTML from the browser: only what the editor can produce is kept.
    const parsed = "description" in validated ? { ...validated, description: sanitizeSectionDescription(validated.description) } : validated;

    await db.$transaction(async (transaction) => {
      const current = await transaction.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: { pageSectionSettings: true } });
      const stored = current?.pageSectionSettings && typeof current.pageSectionSettings === "object" && !Array.isArray(current.pageSectionSettings) ? current.pageSectionSettings : {};
      const next = { ...stored, [sectionId]: parsed };
      await transaction.storeSetting.upsert({
        where: { id: STORE_SETTING_ID },
        create: { id: STORE_SETTING_ID, pageSectionSettings: next },
        update: { pageSectionSettings: next },
      });
      await transaction.auditLog.create({
        data: { actorId: actor.id, action: "PAGE_SECTION_SETTINGS_UPDATE", entityType: "StoreSetting", entityId: STORE_SETTING_ID, ...auditRequestContext(request, { sectionId, changedFields: Object.keys(parsed) }) },
      });
    });
    // { expire: 0 } because the response below re-reads the cached getter immediately.
    revalidateTag("settings:page-sections", { expire: 0 });
    return NextResponse.json(await getPageSectionSettings());
  } catch (error) {
    return apiError(error);
  }
}
