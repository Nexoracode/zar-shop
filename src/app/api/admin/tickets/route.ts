import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { buildTicketAdminWhere, listForAdmin } from "@/modules/tickets/service";
import { serializeTicketSummary } from "@/modules/tickets/admin";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";

export async function GET(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "tickets:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });

    const params = Object.fromEntries(new URL(request.url).searchParams);
    const status = params.status === "OPEN" || params.status === "ANSWERED" || params.status === "CLOSED" ? params.status : undefined;
    const mine = params.mine === "true";
    const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);

    const where = buildTicketAdminWhere({
      status,
      categoryId: params.categoryId || undefined,
      assignedAgentId: mine ? actor.id : (params.assignedAgentId || undefined),
      query: params.q?.trim() || undefined,
    });
    const totalItems = await db.supportTicket.count({ where });
    const pagination = resolveAdminPagination(totalItems, requestedPage, pageSize);
    const items = await listForAdmin(db, where, { skip: pagination.skip, take: pagination.pageSize });

    return NextResponse.json({ items: items.map(serializeTicketSummary), pagination });
  } catch (error) {
    return apiError(error);
  }
}
