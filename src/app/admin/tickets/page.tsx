import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { buildTicketAdminWhere, listForAdmin } from "@/modules/tickets/service";
import { serializeTicketSummary } from "@/modules/tickets/admin";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { BlueprintTicketsView } from "@/components/admin/blueprint/tickets-view";

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
  const [filteredTotal, categories] = await Promise.all([
    db.supportTicket.count({ where }),
    db.supportTicketCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const tickets = await listForAdmin(db, where, { skip: pagination.skip, take: pagination.pageSize });

  return (
    <BlueprintTicketsView
      tickets={tickets.map(serializeTicketSummary)}
      categories={categories}
      query={query}
      status={status ?? ""}
      mine={mine}
      pagination={pagination}
    />
  );
}
