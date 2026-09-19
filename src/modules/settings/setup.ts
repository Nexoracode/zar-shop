import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { readStepsDone, SETUP_STEP_IDS, type SetupState, type SetupStepId } from "@/modules/settings/setup-schemas";

export * from "@/modules/settings/setup-schemas";

// Cheap PK read used by both layouts on every request; `cache` dedupes it within a request.
export const isSetupComplete = cache(async (): Promise<boolean> => {
  const row = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: { setupCompletedAt: true } });
  return Boolean(row?.setupCompletedAt);
});

export const getSetupState = cache(async (): Promise<SetupState> => {
  const [row, gatewayCount, smsCount, activeShippingCount] = await Promise.all([
    db.storeSetting.findUnique({
      where: { id: STORE_SETTING_ID },
      select: { setupCompletedAt: true, setupStepsDone: true, industry: true, mainLogoMediaId: true, faviconMediaId: true, originProvinceId: true },
    }),
    db.paymentGatewayConfig.count({ where: { isActive: true } }),
    db.smsProviderConfig.count(),
    db.shippingMethod.count({ where: { isActive: true } }),
  ]);
  const stepsDone = new Set(readStepsDone(row?.setupStepsDone));
  const steps: Record<SetupStepId, boolean> = {
    basics: stepsDone.has("basics"),
    contact: stepsDone.has("contact"),
    brand: Boolean(row?.mainLogoMediaId) && Boolean(row?.faviconMediaId),
    "payment-sms": gatewayCount > 0 && smsCount > 0,
    shipping: Boolean(row?.originProvinceId) && activeShippingCount > 0,
  };
  return {
    completed: Boolean(row?.setupCompletedAt),
    completedAt: row?.setupCompletedAt?.toISOString() ?? null,
    industry: row?.industry ?? "GENERAL",
    steps,
    allStepsSatisfied: SETUP_STEP_IDS.every((id) => steps[id]),
  };
});
