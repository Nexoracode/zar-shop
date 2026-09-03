import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@generated/prisma/client";
import { createBroadcast, createNotification, listForUser, markAllRead, notifyUsers, NOTIFY_MAX_RECIPIENTS } from "./service";

const draft = { type: "PROMOTION_COUPON" as const, title: "کد تخفیف", body: "متن" };

test("notifyUsers de-dupes the recipient list and builds a per-user dedupeKey", async () => {
  let captured: { data: Array<{ userId: string; dedupeKey: string | null }>; skipDuplicates?: boolean } | null = null;
  const db = {
    notification: { createMany: async (args: typeof captured) => { captured = args; return { count: args!.data.length }; } },
  } as unknown as PrismaClient;

  const count = await notifyUsers(db, ["a", "b", "a"], draft, (userId) => `k:${userId}`);
  assert.equal(count, 2);
  assert.equal(captured!.skipDuplicates, true);
  assert.deepEqual(captured!.data.map((row) => row.userId).sort(), ["a", "b"]);
  assert.deepEqual(captured!.data.map((row) => row.dedupeKey).sort(), ["k:a", "k:b"]);
});

test("notifyUsers truncates a list larger than the cap", async () => {
  let sent = 0;
  const db = {
    notification: { createMany: async (args: { data: unknown[] }) => { sent = args.data.length; return { count: sent }; } },
  } as unknown as PrismaClient;
  const many = Array.from({ length: NOTIFY_MAX_RECIPIENTS + 25 }, (_, index) => `u${index}`);
  await notifyUsers(db, many, draft, "k");
  assert.equal(sent, NOTIFY_MAX_RECIPIENTS);
});

test("createBroadcast creates a row only when none exists for the promotion", async () => {
  let creates = 0;
  const withExisting = {
    notification: { findFirst: async () => ({ id: "n1" }), create: async () => { creates += 1; } },
  } as unknown as PrismaClient;
  assert.equal(await createBroadcast(withExisting, { ...draft, promotionId: "promo-1" }), false);
  assert.equal(creates, 0);

  const fresh = {
    notification: { findFirst: async () => null, create: async () => { creates += 1; } },
  } as unknown as PrismaClient;
  assert.equal(await createBroadcast(fresh, { ...draft, promotionId: "promo-1" }), true);
  assert.equal(creates, 1);
});

test("createNotification swallows a duplicate [userId, dedupeKey]", async () => {
  const db = {
    notification: { create: async () => { throw Object.assign(new Error("dup"), { code: "P2002" }); } },
  } as unknown as PrismaClient;
  await assert.doesNotReject(createNotification(db, "user-1", { ...draft, dedupeKey: "k" }));
});

test("listForUser derives read / dismissed from the current user's receipt", async () => {
  const now = new Date("2026-09-01T00:00:00.000Z");
  const rows = [
    { id: "n1", type: "PROMOTION_COUPON", title: "الف", body: "b", ctaHref: null, promotionId: null, createdAt: new Date("2026-08-30T00:00:00.000Z"), expiresAt: null, reads: [{ readAt: now, dismissedAt: null }] },
    { id: "n2", type: "PROMOTION_COUPON", title: "ب", body: "b", ctaHref: "/x", promotionId: null, createdAt: new Date("2026-08-31T00:00:00.000Z"), expiresAt: null, reads: [] },
  ];
  const db = { notification: { findMany: async () => rows } } as unknown as PrismaClient;
  const items = await listForUser(db, "user-1", { limit: 10, joinedAt: new Date("2026-01-01T00:00:00.000Z"), now });
  assert.deepEqual(items.map((item) => [item.id, item.read, item.dismissed]), [
    ["n1", true, false],
    ["n2", false, false],
  ]);
});

test("markAllRead writes a receipt for every currently-unread visible row", async () => {
  let captured: { data: Array<{ notificationId: string; userId: string }> } | null = null;
  const db = {
    notification: { findMany: async () => [{ id: "n1" }, { id: "n2" }] },
    notificationRead: { createMany: async (args: typeof captured) => { captured = args; return { count: args!.data.length }; } },
  } as unknown as PrismaClient;
  const count = await markAllRead(db, "user-1", new Date("2026-01-01T00:00:00.000Z"));
  assert.equal(count, 2);
  assert.deepEqual(captured!.data, [
    { notificationId: "n1", userId: "user-1" },
    { notificationId: "n2", userId: "user-1" },
  ]);
});
