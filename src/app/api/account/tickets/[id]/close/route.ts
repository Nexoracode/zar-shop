import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { closeTicket, TicketValidationError } from "@/modules/tickets/service";
import { auditRequestContext } from "@/modules/audit/request-context";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const [user, { id }] = await Promise.all([getCurrentUser(), context.params]);
    if (!user || user.isGuest) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });

    const ticket = await db.$transaction(async (tx) => {
      const updated = await closeTicket(tx, { ticketId: id, actorId: user.id, isAgent: false });
      await tx.auditLog.create({ data: { actorId: user.id, action: "TICKET_STATUS_UPDATE", entityType: "SupportTicket", entityId: id, ...auditRequestContext(request, { status: "CLOSED" }) } });
      return updated;
    });
    return NextResponse.json({ id: ticket.id, status: ticket.status });
  } catch (error) {
    if (error instanceof TicketValidationError) return NextResponse.json({ message: error.message }, { status: 422 });
    return apiError(error);
  }
}
