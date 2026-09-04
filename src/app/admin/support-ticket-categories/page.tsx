import { BlueprintSupportTicketCategoriesView } from "@/components/admin/blueprint/support-ticket-categories-view";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

export default async function SupportTicketCategoriesPage() {
  await requirePermission("tickets:manage");
  const categories = await db.supportTicketCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { tickets: true } } },
  });
  return <BlueprintSupportTicketCategoriesView categories={categories} />;
}
