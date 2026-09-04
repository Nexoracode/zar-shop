import type { Prisma, PrismaClient } from "@generated/prisma/client";
import { createNotification } from "@/modules/notifications/service";

type DbLike = PrismaClient | Prisma.TransactionClient;

/** Tells the ticket owner an agent just replied. Never fired the other way — there is no admin notification bell yet. */
export async function notifyTicketAgentReply(db: DbLike, input: { ticketUserId: string; ticketId: string; subject: string; messageId: string }) {
  await createNotification(db, input.ticketUserId, {
    type: "TICKET_MESSAGE",
    title: "پاسخ جدید در تیکت شما",
    body: input.subject,
    ctaHref: `/account/tickets/${input.ticketId}`,
    dedupeKey: `TICKET_MESSAGE:${input.messageId}`,
  });
}

export async function notifyTicketClosedByAgent(db: DbLike, input: { ticketUserId: string; ticketId: string; subject: string }) {
  await createNotification(db, input.ticketUserId, {
    type: "TICKET_STATUS",
    title: "تیکت شما بسته شد",
    body: input.subject,
    ctaHref: `/account/tickets/${input.ticketId}`,
  });
}
