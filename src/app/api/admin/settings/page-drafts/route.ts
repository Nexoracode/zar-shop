import { NextResponse } from "next/server";
import type { Prisma } from "@generated/prisma/client";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { getPermittedActor } from "@/modules/auth/session";
import { parseStoredDisplay } from "@/modules/page-builder/display-parts";
import { discardDraftSections } from "@/modules/page-builder/draft-sections";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

// Sections added from the page builder stay drafts until the layout that contains them is saved (see
// modules/page-builder/draft-sections.ts). DELETE throws the given drafts away: "cancel" in the builder, a section
// removed again before saving, or a session that was abandoned. Ids that are not drafts are ignored, so a section that
// is already part of the page can never be removed through here.

export async function DELETE(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { ids } = z.object({ ids: z.array(z.string().min(1).max(100)).max(40) }).parse(await request.json());

    const discarded = await db.$transaction(async (transaction) => {
      const current = await transaction.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: { pageSectionSettings: true, pageDisplaySettings: true } });
      const result = discardDraftSections(current?.pageSectionSettings, ids);
      if (!result.discarded.length) return [];
      // The display switches of a thrown-away section go with it.
      const display = Object.fromEntries(Object.entries(parseStoredDisplay(current?.pageDisplaySettings)).filter(([id]) => !result.discarded.includes(id)));
      await transaction.storeSetting.update({ where: { id: STORE_SETTING_ID }, data: { pageSectionSettings: result.stored as Prisma.InputJsonObject, pageDisplaySettings: display } });
      await transaction.auditLog.create({
        data: { actorId: actor.id, action: "PAGE_SECTION_DRAFT_DISCARD", entityType: "StoreSetting", entityId: STORE_SETTING_ID, ...auditRequestContext(request, { sectionIds: result.discarded }) },
      });
      return result.discarded;
    });
    if (discarded.length) {
      revalidateTag("settings:page-sections", { expire: 0 });
      revalidateTag("settings:homepage", { expire: 0 });
      revalidateTag("settings:page-display", { expire: 0 });
    }
    return NextResponse.json({ discarded });
  } catch (error) {
    return apiError(error);
  }
}
