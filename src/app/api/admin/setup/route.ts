import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import type { StoreIndustry } from "@generated/prisma/enums";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getPermittedActor } from "@/modules/auth/session";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { auditRequestContext } from "@/modules/audit/request-context";
import { isSetupComplete, readStepsDone, setupStepPayloadSchema } from "@/modules/settings/setup";

type SetupPatch = {
  industry?: StoreIndustry;
  storeName?: string;
  tagline?: string;
  shortDescription?: string;
  supportPhone?: string;
  supportEmail?: string | null;
  storeAddress?: string;
  legalIdentifier?: string;
  supportHours?: string | null;
  originProvinceId?: string;
  originCityId?: string;
};

// Persists one text-driven step of the first-run setup wizard. The heavier steps (brand,
// payment gateway, SMS provider, shipping method) go through their own existing endpoints;
// this only covers the store-identity, contact/legal and shipping-origin fields plus the
// explicit "this step is done" marker for the two that write columns carrying defaults.
export async function PATCH(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    if (await isSetupComplete()) {
      return NextResponse.json({ message: "راه‌اندازی فروشگاه قبلاً کامل شده است؛ از صفحات تنظیمات استفاده کنید." }, { status: 409 });
    }

    const payload = setupStepPayloadSchema.parse(await request.json());

    let fields: SetupPatch;
    if (payload.step === "shipping-origin") {
      const city = await db.city.findUnique({ where: { id: payload.originCityId }, select: { provinceId: true } });
      if (!city || city.provinceId !== payload.originProvinceId) {
        return NextResponse.json({ message: "شهر انتخاب‌شده با استان مبدأ هم‌خوان نیست." }, { status: 422 });
      }
      fields = { originProvinceId: payload.originProvinceId, originCityId: payload.originCityId };
    } else if (payload.step === "basics") {
      fields = { industry: payload.industry, storeName: payload.storeName, tagline: payload.tagline, shortDescription: payload.shortDescription };
    } else {
      fields = { supportPhone: payload.supportPhone, supportEmail: payload.supportEmail, storeAddress: payload.storeAddress, legalIdentifier: payload.legalIdentifier, supportHours: payload.supportHours };
    }
    const changedFields = Object.keys(fields);

    await db.$transaction(async (tx) => {
      const current = await tx.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: { setupStepsDone: true } });
      const done = new Set<string>(readStepsDone(current?.setupStepsDone));
      if (payload.step === "basics" || payload.step === "contact") done.add(payload.step);
      const setupStepsDone = [...done];
      await tx.storeSetting.upsert({
        where: { id: STORE_SETTING_ID },
        create: { id: STORE_SETTING_ID, ...fields, setupStepsDone },
        update: { ...fields, setupStepsDone },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "STORE_SETUP_STEP",
          entityType: "StoreSetting",
          entityId: STORE_SETTING_ID,
          ...auditRequestContext(request, { step: payload.step, changedFields }),
        },
      });
    });

    revalidateTag("settings:general", { expire: 0 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
