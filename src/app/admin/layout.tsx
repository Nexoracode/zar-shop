import { AdminSidebar } from "@/components/admin-sidebar";
import { requireAdminUser } from "@/modules/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminUser();
  return (
    <main className="bg-[#f6f7f9] py-5 sm:py-7 lg:min-h-[calc(100vh-130px)]">
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-start gap-5 px-4 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-7">
        <AdminSidebar user={{ firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role }} />
        <section className="min-w-0 rounded-[24px]">{children}</section>
      </div>
    </main>
  );
}
