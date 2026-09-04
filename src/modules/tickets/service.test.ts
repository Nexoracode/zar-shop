import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@generated/prisma/client";
import { closeTicket, createTicket, postMessage, rateTicket, reopenTicket, TicketValidationError } from "./service";

function ticketDb(overrides: Partial<{ ticket: Record<string, unknown>; category: Record<string, unknown> | null; product: Record<string, unknown> | null }> = {}) {
  const state = {
    ticket: { id: "t1", userId: "user-1", status: "OPEN", assignedAgentId: null, ratedAt: null, ...overrides.ticket },
  };
  return {
    db: {
      product: { findUnique: async () => (overrides.product === undefined ? { id: "p1", name: "گردنبند طلا" } : overrides.product) },
      supportTicketCategory: { findFirst: async () => (overrides.category === undefined ? { id: "c1", name: "سفارش و پرداخت" } : overrides.category) },
      supportTicket: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "t1", ...data }),
        findUnique: async () => state.ticket,
        update: async ({ data }: { data: Record<string, unknown> }) => { Object.assign(state.ticket, data); return state.ticket; },
      },
      supportTicketMessage: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "m1", ...data, attachments: [] }),
      },
    } as unknown as PrismaClient,
    state,
  };
}

test("createTicket derives the subject from the product when product-scoped", async () => {
  const { db } = ticketDb();
  const ticket = await createTicket(db, { userId: "user-1", productId: "p1", body: "سلام، این محصول موجود است؟", attachments: [] });
  assert.equal(ticket.subject, "گردنبند طلا");
  assert.equal(ticket.categoryId, null);
});

test("createTicket requires a category when there is no product", async () => {
  const { db } = ticketDb();
  await assert.rejects(createTicket(db, { userId: "user-1", body: "سؤال دارم", attachments: [] }), TicketValidationError);
});

test("a customer message reopens an ANSWERED ticket", async () => {
  const { db, state } = ticketDb({ ticket: { status: "ANSWERED" } });
  await postMessage(db, { ticketId: "t1", senderId: "user-1", isAgent: false, body: "ممنون، ولی سؤال دیگری دارم", attachments: [] });
  assert.equal(state.ticket.status, "OPEN");
});

test("an agent message answers an OPEN ticket and auto-assigns the agent", async () => {
  const { db, state } = ticketDb({ ticket: { status: "OPEN" } });
  await postMessage(db, { ticketId: "t1", senderId: "agent-1", isAgent: true, body: "بله موجود است", attachments: [] });
  assert.equal(state.ticket.status, "ANSWERED");
  assert.equal(state.ticket.assignedAgentId, "agent-1");
});

test("a closed ticket rejects new messages until reopened", async () => {
  const { db } = ticketDb({ ticket: { status: "CLOSED" } });
  await assert.rejects(
    postMessage(db, { ticketId: "t1", senderId: "user-1", isAgent: false, body: "دوباره باز کنید", attachments: [] }),
    TicketValidationError,
  );
});

test("closing never happens implicitly — reopen only via the explicit action", async () => {
  const { db, state } = ticketDb({ ticket: { status: "CLOSED" } });
  await reopenTicket(db, { ticketId: "t1", actorId: "user-1", isAgent: false });
  assert.equal(state.ticket.status, "OPEN");
});

test("rating is only allowed once, after the ticket is closed", async () => {
  const closed = ticketDb({ ticket: { status: "CLOSED" } });
  const rated = await rateTicket(closed.db, { ticketId: "t1", userId: "user-1", rating: 2, reason: "پاسخ دیر رسید" });
  assert.equal(rated.rating, 2);

  const stillOpen = ticketDb({ ticket: { status: "OPEN" } });
  await assert.rejects(rateTicket(stillOpen.db, { ticketId: "t1", userId: "user-1", rating: 5 }), TicketValidationError);

  const alreadyRated = ticketDb({ ticket: { status: "CLOSED", ratedAt: new Date() } });
  await assert.rejects(rateTicket(alreadyRated.db, { ticketId: "t1", userId: "user-1", rating: 5 }), TicketValidationError);
});

test("only the ticket owner can close it from the customer side", async () => {
  const { db } = ticketDb({ ticket: { status: "OPEN", userId: "user-1" } });
  await assert.rejects(closeTicket(db, { ticketId: "t1", actorId: "someone-else", isAgent: false }), TicketValidationError);
});
