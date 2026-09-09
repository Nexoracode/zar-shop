import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getPermittedActor } from "@/modules/auth/session";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { auditRequestContext } from "@/modules/audit/request-context";
import { getSetupState, isSetupComplete, SETUP_STEP_IDS } from "@/modules/settings/setup";

// Final "activate the store" action of the setup wizard. Re-checks every step server-side so
// the store can never go live with a gap (e.g. the admin deleted the only gateway between
// finishing that step and pressing this button), then opens the storefront.
export async function POST(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    if (await isSetupComplete()) return NextResponse.json({ ok: true });

    const state = await getSetupState();
    if (!state.allStepsSatisfied) {
      const missing = SETUP_STEP_IDS.filter((id) => !state.steps[id]);
      return NextResponse.json({ message: "همه گام‌ها کامل نشده‌اند.", missing }, { status: 422 });
    }

    await db.$transaction(async (tx) => {
      await tx.storeSetting.update({
        where: { id: STORE_SETTING_ID },
        data: { setupCompletedAt: new Date(), isStoreActive: true, maintenanceMode: false },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "STORE_SETUP_COMPLETED",
          entityType: "StoreSetting",
          entityId: STORE_SETTING_ID,
          ...auditRequestContext(request),
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
