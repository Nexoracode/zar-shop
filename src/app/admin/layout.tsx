import { AdminSidebar } from "@/components/admin-sidebar";
import { requireRole } from "@/modules/auth/session";
export default async function AdminLayout({children}:{children:React.ReactNode}){await requireRole(["ADMIN","OPERATOR"]);return <main className="container dashboard"><AdminSidebar/><section>{children}</section></main>}
