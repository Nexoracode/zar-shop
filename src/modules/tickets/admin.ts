import type { Prisma } from "@generated/prisma/client";
import type { ticketInclude } from "@/modules/tickets/service";

type TicketWithRelations = Prisma.SupportTicketGetPayload<{ include: typeof ticketInclude }>;
type MemberRow = { id: string; firstName: string | null; lastName: string | null; role: string };
type MemberNameFields = { firstName: string | null; lastName: string | null };

function memberName(member: MemberNameFields | null) {
  if (!member) return null;
  return `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || "کاربر بدون نام";
}

export function serializeTicketSummary(ticket: TicketWithRelations) {
  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    category: ticket.category ? { id: ticket.category.id, name: ticket.category.name } : null,
    product: ticket.product ? { id: ticket.product.id, name: ticket.product.name, slug: ticket.product.slug } : null,
    customerName: memberName(ticket.user) ?? ticket.user.phone ?? "کاربر بدون نام",
    agentName: memberName(ticket.assignedAgent),
    agentRole: ticket.assignedAgent?.role ?? null,
    messageCount: ticket._count.messages,
    rating: ticket.rating,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    closedAt: ticket.closedAt ? ticket.closedAt.toISOString() : null,
  };
}

type MessageWithRelations = {
  id: string;
  ticketId: string;
  senderId: string;
  body: string;
  createdAt: Date;
  sender: MemberRow;
  attachments: { id: string; url: string; mimeType: string; sizeBytes: number; originalName: string }[];
};

export function serializeMessage(message: MessageWithRelations, ownerId: string) {
  return {
    id: message.id,
    ticketId: message.ticketId,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    isOwnerMessage: message.senderId === ownerId,
    senderName: memberName(message.sender) ?? "کاربر",
    attachments: message.attachments.map((attachment) => ({
      id: attachment.id,
      url: attachment.url,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      originalName: attachment.originalName,
    })),
  };
}

export function serializeTicketDetail(ticket: TicketWithRelations & { messages: MessageWithRelations[] }) {
  return {
    ...serializeTicketSummary(ticket),
    userId: ticket.userId,
    messages: ticket.messages.map((message) => serializeMessage(message, ticket.userId)),
  };
}
