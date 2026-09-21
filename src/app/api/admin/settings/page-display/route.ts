import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { getPermittedActor } from "@/modules/auth/session";
import { pageDisplaySchema } from "@/modules/page-builder/display-parts";
import { getPageDisplaySettings } from "@/modules/page-builder/display-settings";
import { bannerSliderDisplayConfig } from "@/modules/page-builder/banner-sliders";
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
    const { productLists, bannerSliders } = await getPageSectionSettings();
    const dynamic = (id: string) => (productLists[id] ? productListDisplayConfig(productLists[id], industry) : bannerSliders[id] ? bannerSliderDisplayConfig(bannerSliders[id]) : null);
    const { display } = z.object({ display: pageDisplaySchema(industry, dynamic) }).parse(await request.json());

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
