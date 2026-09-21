import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { getPermittedActor } from "@/modules/auth/session";
import { pageDisplaySchema } from "@/modules/page-builder/display-parts";
import { isSectionInstanceId } from "@/modules/page-builder/draft-sections";
import { getPageDisplaySettings } from "@/modules/page-builder/display-settings";
import { bannerSliderDisplayConfig } from "@/modules/page-builder/banner-sliders";
import { categoryStripDisplayConfig, isCategoryStripId } from "@/modules/page-builder/category-strips";
import { productListDisplayConfig } from "@/modules/page-builder/product-lists";
import { getPageSectionSettings } from "@/modules/page-builder/section-settings-store";
import { getStoreIndustry, STORE_SETTING_ID } from "@/modules/settings/store-settings";

export async function GET() {
  const actor = await getPermittedActor("settings:manage");
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getPageDisplaySettings());
}

export async function PATCH(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const industry = await getStoreIndustry();
    // Product lists have the switches their layout offers, so their configuration decides which parts are valid.
    const { productLists, bannerSliders, categoryStrips } = await getPageSectionSettings();
    const dynamic = (id: string) => (productLists[id] ? productListDisplayConfig(productLists[id], industry) : bannerSliders[id] ? bannerSliderDisplayConfig(bannerSliders[id]) : isCategoryStripId(id) && categoryStrips[id] ? categoryStripDisplayConfig(industry) : null);
    // Switches for an added section that doesn't exist (any more) — removed, or thrown away — can only be left over; they are dropped.
    const body = await request.json();
    const raw = body && typeof body === "object" && body.display && typeof body.display === "object" && !Array.isArray(body.display)
      ? { ...body, display: Object.fromEntries(Object.entries(body.display as Record<string, unknown>).filter(([id]) => !isSectionInstanceId(id) || dynamic(id))) }
      : body;
    const { display } = z.object({ display: pageDisplaySchema(industry, dynamic) }).parse(raw);

    await db.$transaction(async (transaction) => {
      await transaction.storeSetting.upsert({
        where: { id: STORE_SETTING_ID },
        create: { id: STORE_SETTING_ID, pageDisplaySettings: display },
        update: { pageDisplaySettings: display },
      });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "PAGE_DISPLAY_SETTINGS_UPDATE",
          entityType: "StoreSetting",
          entityId: STORE_SETTING_ID,
          ...auditRequestContext(request, { sections: Object.keys(display), disabledSections: Object.entries(display).filter(([, entry]) => !entry.enabled).map(([id]) => id) }),
        },
      });
    });
    // { expire: 0 } because the response below re-reads the cached getter immediately.
    revalidateTag("settings:page-display", { expire: 0 });
    return NextResponse.json(await getPageDisplaySettings());
  } catch (error) {
    return apiError(error);
  }
}
