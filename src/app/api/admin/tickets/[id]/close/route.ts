import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { closeTicket, TicketValidationError } from "@/modules/tickets/service";
import { auditRequestContext } from "@/modules/audit/request-context";
import { notifyTicketClosedByAgent } from "@/modules/notifications/ticket-notifications";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "tickets:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;

    const ticket = await db.$transaction(async (tx) => {
      const updated = await closeTicket(tx, { ticketId: id, actorId: actor.id, isAgent: true });
      const withSubject = await tx.supportTicket.findUniqueOrThrow({ where: { id }, select: { userId: true, subject: true } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "TICKET_STATUS_UPDATE", entityType: "SupportTicket", entityId: id, ...auditRequestContext(request, { status: "CLOSED" }) } });
      return { ...updated, ...withSubject };
    });
    await notifyTicketClosedByAgent(db, { ticketUserId: ticket.userId, ticketId: id, subject: ticket.subject });
    return NextResponse.json({ id: ticket.id, status: ticket.status });
  } catch (error) {
    if (error instanceof TicketValidationError) return NextResponse.json({ message: error.message }, { status: 422 });
    return apiError(error);
  }
}
