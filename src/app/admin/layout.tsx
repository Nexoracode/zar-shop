import { AdminSidebar } from "@/components/admin-sidebar";
import { requireRole } from "@/modules/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["ADMIN", "OPERATOR"]);
  return (
    <main className="mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-6 px-5 py-8 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-[30px] lg:py-10 lg:pb-20">
      <AdminSidebar />
      <section className="min-w-0">{children}</section>
    </main>
  );
}
