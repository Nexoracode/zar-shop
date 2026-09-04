import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { reopenTicket, TicketValidationError } from "@/modules/tickets/service";
import { auditRequestContext } from "@/modules/audit/request-context";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "tickets:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;

    const ticket = await db.$transaction(async (tx) => {
      const updated = await reopenTicket(tx, { ticketId: id, actorId: actor.id, isAgent: true });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "TICKET_STATUS_UPDATE", entityType: "SupportTicket", entityId: id, ...auditRequestContext(request, { status: "OPEN" }) } });
      return updated;
    });
    return NextResponse.json({ id: ticket.id, status: ticket.status });
  } catch (error) {
    if (error instanceof TicketValidationError) return NextResponse.json({ message: error.message }, { status: 422 });
    return apiError(error);
  }
}
