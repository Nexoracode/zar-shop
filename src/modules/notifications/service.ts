import type { Prisma, PrismaClient } from "@generated/prisma/client";
import type { NotificationType } from "@/modules/notifications/schemas";

type DbLike = PrismaClient | Prisma.TransactionClient;

/** A promotion can name at most this many recipients; beyond it the list is truncated with a warn. */
export const NOTIFY_MAX_RECIPIENTS = 5000;

export type NotificationDraft = {
  type: NotificationType;
  title: string;
  body: string;
  ctaHref?: string | null;
  promotionId?: string | null;
  dedupeKey?: string | null;
  expiresAt?: Date | null;
};

export type NotificationView = {
  id: string;
  type: string;
  title: string;
  body: string;
  ctaHref: string | null;
  promotionId: string | null;
  createdAt: string;
  expiresAt: string | null;
  read: boolean;
  dismissed: boolean;
};

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

/** Rows visible to a user: their own targeted rows plus broadcasts published after they joined,
 *  minus anything already expired. `joinedAt` is the user's `createdAt`. */
function visibleWhere(userId: string, joinedAt: Date, now: Date): Prisma.NotificationWhereInput {
  return {
    AND: [
      { OR: [{ userId }, { userId: null, createdAt: { gte: joinedAt } }] },
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    ],
  };
}

// —— producers ——

/** Creates one notification, tolerating a duplicate `[userId, dedupeKey]` (already delivered). */
export async function createNotification(db: DbLike, userId: string | null, draft: NotificationDraft) {
  try {
    await db.notification.create({
      data: {
        userId,
        type: draft.type,
        title: draft.title,
        body: draft.body,
        ctaHref: draft.ctaHref ?? null,
        promotionId: draft.promotionId ?? null,
        dedupeKey: draft.dedupeKey ?? null,
        expiresAt: draft.expiresAt ?? null,
      },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }
}

/**
 * Fans a notification out to a bounded list of users. `dedupeKey` is per user (a string or a
 * builder); `skipDuplicates` drops recipients who already have it. Callers pass a list that is
 * already free of guests.
 */
export async function notifyUsers(
  db: DbLike,
  userIds: string[],
  draft: NotificationDraft,
  dedupeKey: string | ((userId: string) => string),
): Promise<number> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return 0;
  const capped = unique.slice(0, NOTIFY_MAX_RECIPIENTS);
  if (capped.length < unique.length) {
    console.warn(`[notifications] recipient list truncated to ${NOTIFY_MAX_RECIPIENTS} (was ${unique.length})`);
  }
  const key = typeof dedupeKey === "function" ? dedupeKey : () => dedupeKey;
  const result = await db.notification.createMany({
    data: capped.map((userId) => ({
      userId,
      type: draft.type,
      title: draft.title,
      body: draft.body,
      ctaHref: draft.ctaHref ?? null,
      promotionId: draft.promotionId ?? null,
      dedupeKey: key(userId),
      expiresAt: draft.expiresAt ?? null,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

/**
 * Creates a single store-wide notification (`userId = null`). MySQL treats every `NULL` userId as
 * distinct, so the `[userId, dedupeKey]` unique index cannot dedupe broadcasts — this does it in
 * code by promotion + type. Returns whether a row was created.
 */
export async function createBroadcast(db: DbLike, draft: NotificationDraft & { promotionId: string }): Promise<boolean> {
  const existing = await db.notification.findFirst({
    where: { userId: null, promotionId: draft.promotionId, type: draft.type },
    select: { id: true },
  });
  if (existing) return false;
  await db.notification.create({
    data: {
      userId: null,
      type: draft.type,
      title: draft.title,
      body: draft.body,
      ctaHref: draft.ctaHref ?? null,
      promotionId: draft.promotionId,
      dedupeKey: draft.dedupeKey ?? null,
      expiresAt: draft.expiresAt ?? null,
    },
  });
  return true;
}

// —— reads ——

export async function unreadCount(db: DbLike, userId: string, joinedAt: Date, now = new Date()): Promise<number> {
  return db.notification.count({
    where: { AND: [visibleWhere(userId, joinedAt, now), { reads: { none: { userId } } }] },
  });
}

export async function listForUser(
  db: DbLike,
  userId: string,
  options: { limit: number; joinedAt: Date; includeDismissed?: boolean; now?: Date },
): Promise<NotificationView[]> {
  const now = options.now ?? new Date();
  if (options.limit <= 0) return [];
  const rows = await db.notification.findMany({
    where: {
      AND: [
        visibleWhere(userId, options.joinedAt, now),
        ...(options.includeDismissed ? [] : [{ reads: { none: { userId, dismissedAt: { not: null } } } }]),
      ],
    },
    include: { reads: { where: { userId }, select: { readAt: true, dismissedAt: true } } },
    orderBy: { createdAt: "desc" },
    take: options.limit,
  });
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    ctaHref: row.ctaHref,
    promotionId: row.promotionId,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    read: row.reads.length > 0,
    dismissed: row.reads[0]?.dismissedAt != null,
  }));
}

async function ensureVisible(db: DbLike, userId: string, joinedAt: Date, notificationId: string) {
  const row = await db.notification.findFirst({
    where: { AND: [{ id: notificationId }, visibleWhere(userId, joinedAt, new Date())] },
    select: { id: true },
  });
  return Boolean(row);
}

/** Marks a notification read for a user (targeted or broadcast alike). Returns false if not visible. */
export async function markRead(db: DbLike, userId: string, joinedAt: Date, notificationId: string): Promise<boolean> {
  if (!(await ensureVisible(db, userId, joinedAt, notificationId))) return false;
  await db.notificationRead.upsert({
    where: { notificationId_userId: { notificationId, userId } },
    create: { notificationId, userId },
    update: {},
  });
  return true;
}

export async function dismiss(db: DbLike, userId: string, joinedAt: Date, notificationId: string): Promise<boolean> {
  if (!(await ensureVisible(db, userId, joinedAt, notificationId))) return false;
  const now = new Date();
  await db.notificationRead.upsert({
    where: { notificationId_userId: { notificationId, userId } },
    create: { notificationId, userId, dismissedAt: now },
    update: { dismissedAt: now },
  });
  return true;
}

export async function markAllRead(db: DbLike, userId: string, joinedAt: Date, now = new Date()): Promise<number> {
  const rows = await db.notification.findMany({
    where: { AND: [visibleWhere(userId, joinedAt, now), { reads: { none: { userId } } }] },
    select: { id: true },
    take: 1000,
  });
  if (rows.length === 0) return 0;
  const result = await db.notificationRead.createMany({
    data: rows.map((row) => ({ notificationId: row.id, userId })),
    skipDuplicates: true,
  });
  return result.count;
}

// —— cleanup ——

/** Bounded delete of notifications past their `expiresAt`; receipts cascade. Mirrors `expirePendingOrders`. */
export async function pruneExpired(db: DbLike, options: { take?: number } = {}): Promise<number> {
  const take = options.take ?? 200;
  const rows = await db.notification.findMany({
    where: { expiresAt: { lt: new Date() } },
    select: { id: true },
    take,
  });
  if (rows.length === 0) return 0;
  const result = await db.notification.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
  return result.count;
}
