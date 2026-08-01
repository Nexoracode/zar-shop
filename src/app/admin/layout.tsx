import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminShell } from "@/components/admin-shell";
import { db } from "@/lib/db";
import { requireAdminUser } from "@/modules/auth/session";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { expirePendingOrders } from "@/modules/orders/expiration";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await expirePendingOrders();
  const [user, goldPrice, notificationCount] = await Promise.all([
    requireAdminUser(),
    getGoldPriceForDisplay(),
    db.order.count({ where: { OR: [{ status: { in: ["PAID", "PROCESSING"] } }, { status: "PENDING_PAYMENT", expirationHandledAt: { not: null }, expiredAt: null }] } }),
  ]);
  const adminUser = { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role };
  return (
    <AdminShell user={adminUser} goldPrice={goldPrice?.pricePerGram18.toString() ?? null} goldFetchedAt={goldPrice?.fetchedAt.toISOString() ?? null} notificationCount={notificationCount} sidebar={<AdminSidebar user={adminUser} />}>
      {children}
    </AdminShell>
  );
}
