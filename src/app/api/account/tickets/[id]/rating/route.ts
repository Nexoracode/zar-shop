import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { ticketRatingSchema } from "@/modules/tickets/schemas";
import { rateTicket, TicketValidationError } from "@/modules/tickets/service";
import { auditRequestContext } from "@/modules/audit/request-context";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const [user, { id }] = await Promise.all([getCurrentUser(), context.params]);
    if (!user || user.isGuest) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });
    const input = ticketRatingSchema.parse(await request.json());

    const ticket = await db.$transaction(async (tx) => {
      const updated = await rateTicket(tx, { ticketId: id, userId: user.id, rating: input.rating, reason: input.reason });
      await tx.auditLog.create({ data: { actorId: user.id, action: "TICKET_RATING_SUBMIT", entityType: "SupportTicket", entityId: id, ...auditRequestContext(request, { rating: input.rating }) } });
      return updated;
    });
    return NextResponse.json({ id: ticket.id, rating: ticket.rating });
  } catch (error) {
    if (error instanceof TicketValidationError) return NextResponse.json({ message: error.message }, { status: 422 });
    return apiError(error);
  }
}
