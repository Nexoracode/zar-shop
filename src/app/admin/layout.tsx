import { cookies } from "next/headers";
import { BlueprintShell } from "@/components/admin/blueprint/shell";
import { SetupPendingNotice } from "@/components/admin/blueprint/setup/setup-pending-notice";
import { SetupWizard } from "@/components/admin/blueprint/setup/setup-wizard";
import { sidebarCollapsedCookie } from "@/lib/admin-sidebar-state";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireAdminUser } from "@/modules/auth/session";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { getPublicGatewayConfigs } from "@/modules/payments/gateway-config";
import { getPublicSmsProviderConfigs } from "@/modules/communications/sms-config";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { getCommerceSettings } from "@/modules/settings/commerce-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getSetupState, isSetupComplete } from "@/modules/settings/setup";
import { getStoreIndustry } from "@/modules/settings/store-settings";

// The whole admin area is per-session and per-role; a static shell has no value here, so this
// segment stays fully dynamic under Cache Components instead of chasing an instant-navigation
// shell that would need Suspense-wrapping the auth/session reads on every one of ~77 pages.
export const instant = false;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminUser();

  // Until the first-run wizard is finished the whole /admin area is the wizard (for ADMIN) or
  // a holding notice (for the scoped manager roles, who cannot complete store-wide setup).
  if (!(await isSetupComplete())) {
    const general = await getGeneralStoreSettings();
    if (user.role !== "ADMIN") return <SetupPendingNotice storeName={general.storeName} />;
    const [state, brand, commerce, provinces, gateways, smsConfigs] = await Promise.all([
      getSetupState(),
      getBrandSettings(),
      getCommerceSettings(),
      db.province.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      getPublicGatewayConfigs(),
      getPublicSmsProviderConfigs(),
    ]);
    return (
      <SetupWizard
        state={state}
        storeName={general.storeName}
        basics={{ industry: general.industry, storeName: general.storeName, tagline: general.tagline, shortDescription: general.shortDescription }}
        contact={{
          supportPhone: general.supportPhone ?? "",
          supportEmail: general.supportEmail ?? "",
          storeAddress: general.storeAddress ?? "",
          legalIdentifier: general.legalIdentifier ?? "",
          supportHours: general.supportHours ?? "",
        }}
        brand={brand}
        origin={{ provinceId: commerce.originProvinceId, cityId: commerce.originCityId }}
        provinces={provinces}
        gateways={gateways}
        smsConfigs={smsConfigs}
        appUrl={env.APP_URL}
      />
    );
  }

  await expirePendingOrders();
  const [storeIndustry, notificationCount] = await Promise.all([
    getStoreIndustry(),
    db.order.count({ where: { OR: [{ status: { in: ["PAID", "PROCESSING"] } }, { status: "PENDING_PAYMENT", expirationHandledAt: { not: null }, expiredAt: null }] } }),
  ]);
  const goldPrice = storeIndustry === "GOLD" ? await getGoldPriceForDisplay() : null;
  const sidebarCollapsed = (await cookies()).get(sidebarCollapsedCookie)?.value === "1";
  return (
    <BlueprintShell
      user={{ firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role }}
      showGoldPrice={storeIndustry === "GOLD"}
      goldPrice={goldPrice?.pricePerGram18.toString() ?? null}
      goldFetchedAt={goldPrice?.fetchedAt.toISOString() ?? null}
      notificationCount={notificationCount}
      industry={storeIndustry}
      sidebarCollapsed={sidebarCollapsed}
    >
      {children}
    </BlueprintShell>
  );
}
