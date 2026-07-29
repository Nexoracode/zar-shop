import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminShell } from "@/components/admin-shell";
import { db } from "@/lib/db";
import { requireAdminUser } from "@/modules/auth/session";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, goldPrice, notificationCount] = await Promise.all([
    requireAdminUser(),
    getGoldPriceForDisplay(),
    db.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
  ]);
  const adminUser = { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role };
  return (
    <AdminShell user={adminUser} goldPrice={goldPrice?.pricePerGram18.toString() ?? null} goldFetchedAt={goldPrice?.fetchedAt.toISOString() ?? null} notificationCount={notificationCount} sidebar={<AdminSidebar user={adminUser} />}>
      {children}
    </AdminShell>
  );
}
