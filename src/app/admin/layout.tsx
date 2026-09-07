import { cookies } from "next/headers";
import { BlueprintShell } from "@/components/admin/blueprint/shell";
import { sidebarCollapsedCookie } from "@/lib/admin-sidebar-state";
import { db } from "@/lib/db";
import { requireAdminUser } from "@/modules/auth/session";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { getStoreIndustry } from "@/modules/settings/store-settings";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await expirePendingOrders();
  const [user, storeIndustry, notificationCount] = await Promise.all([
    requireAdminUser(),
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
