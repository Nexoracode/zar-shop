import { AdminSidebar } from "@/components/admin-sidebar";
import { requireRole } from "@/modules/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["ADMIN", "OPERATOR"]);
  return (
    <main className="w-[min(1240px,calc(100%-40px))] mx-auto grid grid-cols-[240px_1fr] gap-[30px] py-10 pb-20 max-[760px]:grid-cols-1">
      <AdminSidebar />
      <section>{children}</section>
    </main>
  );
}
