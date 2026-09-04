import type { Prisma, PrismaClient } from "@generated/prisma/client";
import type { TicketStatus } from "@generated/prisma/enums";
import type { UploadedTicketFile } from "@/modules/tickets/attachments";

type DbLike = PrismaClient | Prisma.TransactionClient;

export class TicketValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TicketValidationError";
  }
}

const memberSelect = { id: true, firstName: true, lastName: true, role: true } satisfies Prisma.UserSelect;

export const ticketInclude = {
  category: { select: { id: true, name: true } },
  product: { select: { id: true, name: true, slug: true } },
  assignedAgent: { select: memberSelect },
  user: { select: { id: true, firstName: true, lastName: true, phone: true } },
  _count: { select: { messages: true } },
} satisfies Prisma.SupportTicketInclude;

const messageInclude = {
  attachments: true,
  sender: { select: memberSelect },
} satisfies Prisma.SupportTicketMessageInclude;

function attachmentsCreateInput(files: UploadedTicketFile[]) {
  return files.map((file) => ({
    url: file.url,
    storageKey: file.storageKey,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    originalName: file.originalName,
  }));
}

/**
 * Opens a ticket with its first message in one step — no empty/ghost ticket can exist without
 * at least one message. Product-scoped tickets need no category (the product itself is the
 * subject); profile-started tickets must name a category.
 */
export async function createTicket(db: DbLike, input: {
  userId: string;
  productId?: string | null;
  categoryId?: string | null;
  body: string;
  attachments: UploadedTicketFile[];
}) {
  if (!input.body.trim() && input.attachments.length === 0) throw new TicketValidationError("متن یا فایلی برای ارسال وجود ندارد.");

  let subject: string;
  let categoryId: string | null = null;
  if (input.productId) {
    const product = await db.product.findUnique({ where: { id: input.productId }, select: { id: true, name: true } });
    if (!product) throw new TicketValidationError("محصول پیدا نشد.");
    subject = product.name;
  } else {
    if (!input.categoryId) throw new TicketValidationError("موضوع تیکت را انتخاب کنید.");
    const category = await db.supportTicketCategory.findFirst({ where: { id: input.categoryId, isActive: true }, select: { id: true, name: true } });
    if (!category) throw new TicketValidationError("موضوع تیکت معتبر نیست.");
    categoryId = category.id;
    subject = category.name;
  }

  return db.supportTicket.create({
    data: {
      userId: input.userId,
      productId: input.productId ?? null,
      categoryId,
      subject,
      status: "OPEN",
      messages: {
        create: {
          senderId: input.userId,
          body: input.body,
          attachments: { create: attachmentsCreateInput(input.attachments) },
        },
      },
    },
    include: ticketInclude,
  });
}

/**
 * Posts a reply and moves the ticket through its state machine: a customer message reopens an
 * ANSWERED ticket back to OPEN (support owes a reply), an agent message answers to ANSWERED.
 * CLOSED is terminal — neither side can post on it, and there is no way back to OPEN once a
 * ticket is closed. The first agent reply auto-assigns the ticket to that agent.
 */
export async function postMessage(db: DbLike, input: {
  ticketId: string;
  senderId: string;
  isAgent: boolean;
  body: string;
  attachments: UploadedTicketFile[];
}) {
  if (!input.body.trim() && input.attachments.length === 0) throw new TicketValidationError("متن یا فایلی برای ارسال وجود ندارد.");
  const ticket = await db.supportTicket.findUnique({ where: { id: input.ticketId }, select: { id: true, status: true, assignedAgentId: true, userId: true } });
  if (!ticket) throw new TicketValidationError("تیکت پیدا نشد.");
  if (!input.isAgent && ticket.userId !== input.senderId) throw new TicketValidationError("دسترسی به این تیکت مجاز نیست.");
  if (ticket.status === "CLOSED") throw new TicketValidationError("این تیکت بسته شده است و دیگر قابل ادامه نیست.");

  const message = await db.supportTicketMessage.create({
    data: {
      ticketId: ticket.id,
      senderId: input.senderId,
      body: input.body,
      attachments: { create: attachmentsCreateInput(input.attachments) },
    },
    include: messageInclude,
  });

  const nextStatus: TicketStatus = input.isAgent ? "ANSWERED" : "OPEN";
  await db.supportTicket.update({
    where: { id: ticket.id },
    data: {
      status: nextStatus,
      ...(input.isAgent && !ticket.assignedAgentId ? { assignedAgentId: input.senderId } : {}),
    },
  });

  return message;
}

export async function closeTicket(db: DbLike, input: { ticketId: string; actorId: string; isAgent: boolean }) {
  const ticket = await db.supportTicket.findUnique({ where: { id: input.ticketId }, select: { id: true, userId: true, status: true } });
  if (!ticket) throw new TicketValidationError("تیکت پیدا نشد.");
  if (!input.isAgent && ticket.userId !== input.actorId) throw new TicketValidationError("دسترسی به این تیکت مجاز نیست.");
  if (ticket.status === "CLOSED") return ticket;
  return db.supportTicket.update({ where: { id: ticket.id }, data: { status: "CLOSED", closedAt: new Date() } });
}

export async function rateTicket(db: DbLike, input: { ticketId: string; userId: string; rating: number; reason?: string | null }) {
  const ticket = await db.supportTicket.findUnique({ where: { id: input.ticketId }, select: { id: true, userId: true, status: true, ratedAt: true } });
  if (!ticket || ticket.userId !== input.userId) throw new TicketValidationError("تیکت پیدا نشد.");
  if (ticket.status !== "CLOSED") throw new TicketValidationError("فقط تیکت بسته‌شده قابل امتیازدهی است.");
  if (ticket.ratedAt) throw new TicketValidationError("این تیکت قبلاً امتیاز گرفته است.");
  return db.supportTicket.update({ where: { id: ticket.id }, data: { rating: input.rating, ratingReason: input.reason ?? null, ratedAt: new Date() } });
}

export type LastMessagePreview = { body: string; createdAt: Date; fromCustomer: boolean; hasAttachment: boolean };

/**
 * One extra query instead of embedding `messages` in `ticketInclude`, so the preview never
 * collides with the full-thread `messages` override that `getTicketForUser`/`getTicketForAgent`
 * apply on the same include object.
 */
async function lastMessagesByTicket(db: DbLike, ticketIds: string[]): Promise<Map<string, LastMessagePreview>> {
  if (!ticketIds.length) return new Map();
  const rows = await db.supportTicketMessage.findMany({
    where: { ticketId: { in: ticketIds } },
    orderBy: { createdAt: "desc" },
    distinct: ["ticketId"],
    select: { ticketId: true, body: true, createdAt: true, senderId: true, ticket: { select: { userId: true } }, attachments: { select: { id: true }, take: 1 } },
  });
  const map = new Map<string, LastMessagePreview>();
  for (const row of rows) {
    map.set(row.ticketId, { body: row.body, createdAt: row.createdAt, fromCustomer: row.senderId === row.ticket.userId, hasAttachment: row.attachments.length > 0 });
  }
  return map;
}

async function withLastMessages<T extends { id: string }>(db: DbLike, tickets: T[]) {
  const lastMessages = await lastMessagesByTicket(db, tickets.map((ticket) => ticket.id));
  return tickets.map((ticket) => ({ ...ticket, lastMessage: lastMessages.get(ticket.id) ?? null }));
}

export async function listForUser(db: DbLike, userId: string) {
  const tickets = await db.supportTicket.findMany({ where: { userId }, include: ticketInclude, orderBy: { updatedAt: "desc" } });
  return withLastMessages(db, tickets);
}

export async function getTicketForUser(db: DbLike, ticketId: string, userId: string) {
  return db.supportTicket.findFirst({
    where: { id: ticketId, userId },
    include: { ...ticketInclude, messages: { include: messageInclude, orderBy: { createdAt: "asc" } } },
  });
}

export async function getTicketForAgent(db: DbLike, ticketId: string) {
  return db.supportTicket.findUnique({
    where: { id: ticketId },
    include: { ...ticketInclude, messages: { include: messageInclude, orderBy: { createdAt: "asc" } } },
  });
}

export async function listMessagesSince(db: DbLike, ticketId: string, after?: Date) {
  return db.supportTicketMessage.findMany({
    where: { ticketId, ...(after ? { createdAt: { gt: after } } : {}) },
    include: messageInclude,
    orderBy: { createdAt: "asc" },
  });
}

export function buildTicketAdminWhere(filters: { status?: TicketStatus; categoryId?: string; assignedAgentId?: string; query?: string }): Prisma.SupportTicketWhereInput {
  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.assignedAgentId ? { assignedAgentId: filters.assignedAgentId } : {}),
    ...(filters.query
      ? {
          OR: [
            { subject: { contains: filters.query } },
            { user: { firstName: { contains: filters.query } } },
            { user: { lastName: { contains: filters.query } } },
            { user: { phone: { contains: filters.query } } },
          ],
        }
      : {}),
  };
}

export async function listForAdmin(db: DbLike, where: Prisma.SupportTicketWhereInput, pagination: { skip: number; take: number }) {
  const tickets = await db.supportTicket.findMany({ where, include: ticketInclude, orderBy: { updatedAt: "desc" }, skip: pagination.skip, take: pagination.take });
  return withLastMessages(db, tickets);
}
