import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { ticketMessageSchema } from "@/modules/tickets/schemas";
import { listMessagesSince, postMessage, TicketValidationError } from "@/modules/tickets/service";
import { serializeMessage } from "@/modules/tickets/admin";
import { rollbackTicketFiles, TicketAttachmentValidationError, uploadTicketFiles, validateTicketFiles, type UploadedTicketFile } from "@/modules/tickets/attachments";
import { auditRequestContext } from "@/modules/audit/request-context";
import { notifyTicketAgentReply } from "@/modules/notifications/ticket-notifications";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "tickets:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const ticket = await db.supportTicket.findUnique({ where: { id }, select: { userId: true } });
    if (!ticket) return NextResponse.json({ message: "تیکت پیدا نشد." }, { status: 404 });
    const after = new URL(request.url).searchParams.get("after");
    const messages = await listMessagesSince(db, id, after ? new Date(after) : undefined);
    return NextResponse.json({ items: messages.map((message) => serializeMessage(message, ticket.userId)) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  let uploaded: UploadedTicketFile[] = [];
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "tickets:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;

    const form = await request.formData();
    const files = form.getAll("file").filter((item): item is File => item instanceof File && item.size > 0);
    const input = ticketMessageSchema.parse({ body: String(form.get("body") ?? "") });
    validateTicketFiles(files);
    uploaded = await uploadTicketFiles(files);

    const { message, ticket } = await db.$transaction(async (tx) => {
      const created = await postMessage(tx, { ticketId: id, senderId: actor.id, isAgent: true, body: input.body, attachments: uploaded });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "TICKET_MESSAGE_SEND", entityType: "SupportTicket", entityId: id, ...auditRequestContext(request, { messageId: created.id }) } });
      const current = await tx.supportTicket.findUniqueOrThrow({ where: { id }, select: { userId: true, subject: true } });
      return { message: created, ticket: current };
    });
    await notifyTicketAgentReply(db, { ticketUserId: ticket.userId, ticketId: id, subject: ticket.subject, messageId: message.id });
    return NextResponse.json(serializeMessage(message, ticket.userId), { status: 201 });
  } catch (error) {
    await rollbackTicketFiles(uploaded);
    if (error instanceof TicketValidationError || error instanceof TicketAttachmentValidationError) {
      return NextResponse.json({ message: error.message }, { status: 422 });
    }
    return apiError(error);
  }
}
