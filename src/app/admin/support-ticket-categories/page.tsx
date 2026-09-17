import { BlueprintSupportTicketCategoriesView } from "@/components/admin/blueprint/support-ticket-categories-view";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function SupportTicketCategoriesPage() {
  await requirePermission("tickets:manage");
  const categories = await db.supportTicketCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { tickets: true } } },
  });
  return <BlueprintSupportTicketCategoriesView categories={categories} />;
}
