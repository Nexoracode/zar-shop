import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { buildTicketAdminWhere, listForAdmin } from "@/modules/tickets/service";
import { serializeTicketSummary } from "@/modules/tickets/admin";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { readHiddenColumns } from "@/lib/admin-column-visibility-server";
import { BlueprintTicketsView } from "@/components/admin/blueprint/tickets-view";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type SearchParams = Promise<{ q?: string; status?: string; categoryId?: string; mine?: string; page?: string; pageSize?: string }>;

export default async function AdminTicketsPage({ searchParams }: { searchParams: SearchParams }) {
  const actor = await requirePermission("tickets:manage");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = params.status === "OPEN" || params.status === "ANSWERED" || params.status === "CLOSED" ? params.status : undefined;
  const categoryId = params.categoryId?.trim() || undefined;
  const mine = params.mine === "true";
  const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);

  const where = buildTicketAdminWhere({ status, categoryId, assignedAgentId: mine ? actor.id : undefined, query });
  const [filteredTotal, categories, initialHiddenColumns] = await Promise.all([
    db.supportTicket.count({ where }),
    db.supportTicketCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    readHiddenColumns("tickets"),
  ]);
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const tickets = await listForAdmin(db, where, { skip: pagination.skip, take: pagination.pageSize });

  return (
    <BlueprintTicketsView
      tickets={tickets.map(serializeTicketSummary)}
      categories={categories}
      query={query}
      status={status ?? ""}
      categoryId={categoryId ?? ""}
      mine={mine}
      pagination={pagination}
      initialHiddenColumns={initialHiddenColumns}
    />
  );
}
