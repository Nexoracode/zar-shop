import { cookies } from "next/headers";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminShell } from "@/components/admin-shell";
import { BlueprintShell } from "@/components/admin/blueprint/shell";
import { sidebarCollapsedCookie } from "@/lib/admin-sidebar-state";
import { db } from "@/lib/db";
import { requireAdminUser } from "@/modules/auth/session";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { getStoreIndustry } from "@/modules/settings/store-settings";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await expirePendingOrders();
  const [user, storeIndustry, brandSettings, notificationCount] = await Promise.all([
    requireAdminUser(),
    getStoreIndustry(),
    getBrandSettings(),
    db.order.count({ where: { OR: [{ status: { in: ["PAID", "PROCESSING"] } }, { status: "PENDING_PAYMENT", expirationHandledAt: { not: null }, expiredAt: null }] } }),
  ]);
  const goldPrice = storeIndustry === "GOLD" ? await getGoldPriceForDisplay() : null;
  const adminUser = { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role };
  const shellProps = {
    user: adminUser,
    showGoldPrice: storeIndustry === "GOLD",
    goldPrice: goldPrice?.pricePerGram18.toString() ?? null,
    goldFetchedAt: goldPrice?.fetchedAt.toISOString() ?? null,
    notificationCount,
  };
  if (brandSettings.adminTemplate === "BLUEPRINT") {
    // Read here rather than in the rail: the server has to know the width to paint it right.
    const sidebarCollapsed = (await cookies()).get(sidebarCollapsedCookie)?.value === "1";
    return <BlueprintShell {...shellProps} sidebarCollapsed={sidebarCollapsed}>{children}</BlueprintShell>;
  }
  return (
    <AdminShell {...shellProps} sidebar={<AdminSidebar user={adminUser} />}>
      {children}
    </AdminShell>
  );
}
