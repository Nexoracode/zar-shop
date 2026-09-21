import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { getPermittedActor } from "@/modules/auth/session";
import { bannerSliderConfigSchema, isBannerSliderId, newBannerSliderId, resolveBannerSliders, type BannerSliderConfig } from "@/modules/page-builder/banner-sliders";
import { parseStoredDisplay } from "@/modules/page-builder/display-parts";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

// The banner sliders added from the page builder: POST adds one, PATCH edits one (its look and its banners). A slider
// is stored in `StoreSetting.pageSectionSettings.BANNER_SLIDERS` under its section id; everything else there is kept.

async function mediaProblem(config: BannerSliderConfig) {
  const ids = [...new Set(config.slides.flatMap((slide) => [slide.desktopMediaId, slide.mobileMediaId]).filter((id): id is string => Boolean(id)))];
  if (!ids.length) return null;
  const media = await db.mediaAsset.findMany({ where: { id: { in: ids }, scope: "HOMEPAGE", type: "IMAGE" }, select: { id: true } });
  return media.length === ids.length ? null : NextResponse.json({ message: "یکی از تصاویر انتخاب‌شده برای بنر معتبر نیست." }, { status: 422 });
}

async function storeSlider(id: string, config: BannerSliderConfig, actor: { id: string }, request: Request, action: "BANNER_SLIDER_CREATE" | "BANNER_SLIDER_UPDATE") {
  await db.$transaction(async (transaction) => {
    const current = await transaction.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: { pageSectionSettings: true, pageDisplaySettings: true } });
    const stored = current?.pageSectionSettings && typeof current.pageSectionSettings === "object" && !Array.isArray(current.pageSectionSettings) ? current.pageSectionSettings : {};
    const sliders = "BANNER_SLIDERS" in stored && stored.BANNER_SLIDERS && typeof stored.BANNER_SLIDERS === "object" && !Array.isArray(stored.BANNER_SLIDERS) ? stored.BANNER_SLIDERS : {};
    const next = { ...stored, BANNER_SLIDERS: { ...sliders, [id]: config } };
    // A new look may lack the switches an earlier one had turned off (the peeking look has no arrows).
    const display = parseStoredDisplay(current?.pageDisplaySettings);
    const entry = display[id];
    const hiddenParts = entry && config.layout === "SLIDER_PEEK" ? entry.hiddenParts.filter((part) => part !== "arrows") : entry?.hiddenParts;
    const nextDisplay = entry ? { ...display, [id]: { ...entry, hiddenParts: hiddenParts ?? [] } } : display;
    await transaction.storeSetting.upsert({
      where: { id: STORE_SETTING_ID },
      create: { id: STORE_SETTING_ID, pageSectionSettings: next, pageDisplaySettings: nextDisplay },
      update: { pageSectionSettings: next, pageDisplaySettings: nextDisplay },
    });
    await transaction.auditLog.create({
      data: { actorId: actor.id, action, entityType: "StoreSetting", entityId: STORE_SETTING_ID, ...auditRequestContext(request, { sectionId: id, layout: config.layout, slideCount: config.slides.length }) },
    });
  });
  // The homepage settings are tagged too: the layout's list of sections is derived from the stored sliders.
  revalidateTag("settings:page-sections", { expire: 0 });
  revalidateTag("settings:homepage", { expire: 0 });
  revalidateTag("settings:page-display", { expire: 0 });
}

export async function POST(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const config = bannerSliderConfigSchema.parse(await request.json());
    const problem = await mediaProblem(config);
    if (problem) return problem;
    const id = newBannerSliderId(crypto.randomUUID());
    await storeSlider(id, config, actor, request, "BANNER_SLIDER_CREATE");
    return NextResponse.json({ id });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id, config } = z.object({ id: z.string().min(1).max(100), config: bannerSliderConfigSchema }).parse(await request.json());
    const current = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: { pageSectionSettings: true } });
    if (!isBannerSliderId(id) || !resolveBannerSliders(current?.pageSectionSettings)[id]) return NextResponse.json({ message: "این اسلایدر وجود ندارد." }, { status: 404 });
    const problem = await mediaProblem(config);
    if (problem) return problem;
    await storeSlider(id, config, actor, request, "BANNER_SLIDER_UPDATE");
    return NextResponse.json({ id });
  } catch (error) {
    return apiError(error);
  }
}
