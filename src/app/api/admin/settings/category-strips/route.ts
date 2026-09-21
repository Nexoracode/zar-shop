import { NextResponse } from "next/server";
import type { Prisma } from "@generated/prisma/client";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { getPermittedActor } from "@/modules/auth/session";
import { isCategoryStripId, newCategoryStripId, resolveCategoryStrips } from "@/modules/page-builder/category-strips";
import { addDraftSectionId, readDraftSectionIds } from "@/modules/page-builder/draft-sections";
import { sanitizeSectionDescription } from "@/modules/page-builder/rich-text-sanitize";
import { categoriesSectionSettingsSchema, type CategoriesSectionSettings } from "@/modules/page-builder/section-settings";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

// The category strips added from the page builder (see modules/page-builder/category-strips.ts): POST adds one (as a
// draft, see modules/page-builder/draft-sections.ts), PATCH edits one. A strip is stored in
// `StoreSetting.pageSectionSettings.CATEGORY_STRIPS` under its section id; everything else there is kept.

// The description is HTML from the browser: only what the editor can produce is kept.
function clean(settings: CategoriesSectionSettings): CategoriesSectionSettings {
  return { ...settings, description: sanitizeSectionDescription(settings.description) };
}

async function storeStrip(id: string, settings: CategoriesSectionSettings, actor: { id: string }, request: Request, action: "CATEGORY_STRIP_CREATE" | "CATEGORY_STRIP_UPDATE") {
  await db.$transaction(async (transaction) => {
    const current = await transaction.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: { pageSectionSettings: true } });
    const stored = current?.pageSectionSettings && typeof current.pageSectionSettings === "object" && !Array.isArray(current.pageSectionSettings) ? current.pageSectionSettings : {};
    const strips = "CATEGORY_STRIPS" in stored && stored.CATEGORY_STRIPS && typeof stored.CATEGORY_STRIPS === "object" && !Array.isArray(stored.CATEGORY_STRIPS) ? stored.CATEGORY_STRIPS : {};
    const updated = { ...stored, CATEGORY_STRIPS: { ...strips, [id]: settings } };
    // A new strip is a draft until a layout that contains it is saved; the visitors don't see it before that.
    const next = action === "CATEGORY_STRIP_CREATE" ? (addDraftSectionId(updated, id) as Prisma.InputJsonObject) : updated;
    await transaction.storeSetting.upsert({
      where: { id: STORE_SETTING_ID },
      create: { id: STORE_SETTING_ID, pageSectionSettings: next },
      update: { pageSectionSettings: next },
    });
    await transaction.auditLog.create({
      data: { actorId: actor.id, action, entityType: "StoreSetting", entityId: STORE_SETTING_ID, ...auditRequestContext(request, { sectionId: id, limit: settings.limit, sort: settings.sort }) },
    });
  });
  // The homepage settings are tagged too: the layout's list of sections is derived from the stored strips.
  revalidateTag("settings:page-sections", { expire: 0 });
  revalidateTag("settings:homepage", { expire: 0 });
}

export async function POST(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const body = await request.json();
    const settings = clean(categoriesSectionSettingsSchema.parse(body));
    // The page builder creates a strip under the id it already gave it in its draft; saving again after a failed
    // attempt finds the draft it made and overwrites it.
    const requestedId = typeof body?.id === "string" ? body.id : null;
    if (requestedId) {
      const current = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: { pageSectionSettings: true } });
      if (!isCategoryStripId(requestedId)) return NextResponse.json({ message: "شناسه بخش دسته‌بندی معتبر نیست." }, { status: 422 });
      if (requestedId in resolveCategoryStrips(current?.pageSectionSettings) && !readDraftSectionIds(current?.pageSectionSettings).includes(requestedId)) {
        return NextResponse.json({ message: "این بخش دسته‌بندی قبلاً ثبت شده است." }, { status: 409 });
      }
    }
    const id = requestedId ?? newCategoryStripId(crypto.randomUUID());
    await storeStrip(id, settings, actor, request, "CATEGORY_STRIP_CREATE");
    return NextResponse.json({ id });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id, settings: submitted } = z.object({ id: z.string().min(1).max(100), settings: categoriesSectionSettingsSchema }).parse(await request.json());
    const current = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: { pageSectionSettings: true } });
    if (!isCategoryStripId(id) || !resolveCategoryStrips(current?.pageSectionSettings)[id]) return NextResponse.json({ message: "این بخش دسته‌بندی وجود ندارد." }, { status: 404 });
    await storeStrip(id, clean(submitted), actor, request, "CATEGORY_STRIP_UPDATE");
    return NextResponse.json({ id });
  } catch (error) {
    return apiError(error);
  }
}
