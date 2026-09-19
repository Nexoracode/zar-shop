import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseUserAgent } from "@/modules/analytics/user-agent";
import { referrerHost } from "@/modules/analytics/referrer";

export const VISITOR_COOKIE = "zar_vid";
export const VISITOR_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365;
/** A visitor counts as "online" while they have been seen this recently (page view or heartbeat). */
export const ONLINE_WINDOW_MS = 5 * 60_000;
export const PAGE_VIEW_RETENTION_DAYS = 90;
/** The same visitor opening the same path again inside this window is one view (double-fire, rapid refresh). */
const DUPLICATE_WINDOW_MS = 3_000;
const PRUNE_PROBABILITY = 1 / 200;

export const trackPayloadSchema = z.object({
  path: z.string().min(1).max(600),
  referrer: z.string().max(600).optional(),
  heartbeat: z.boolean().optional(),
});

export function isValidVisitorId(value: string | undefined | null): value is string {
  return Boolean(value && /^[a-f0-9]{32}$/.test(value));
}

export function newVisitorId() {
  return randomBytes(16).toString("hex");
}

/** The page's own path — no query string or fragment (both can carry personal data) — or null when it is not a storefront page worth counting. */
export function trackablePath(rawPath: string): string | null {
  const path = rawPath.split(/[?#]/)[0];
  if (!path.startsWith("/") || path.startsWith("//") || path.length > 255) return null;
  if (path === "/admin" || path.startsWith("/admin/") || path === "/api" || path.startsWith("/api/") || path.startsWith("/_next")) return null;
  return path;
}

type VisitInput = {
  visitorId: string;
  payload: z.infer<typeof trackPayloadSchema>;
  userAgent: string | null;
  ownHost: string | null;
  now?: Date;
};

/**
 * Records one storefront visit. Returns without writing for bots, for paths that are not
 * storefront pages, and for an immediate repeat of the same view. A heartbeat only refreshes
 * the visitor's "online" presence — it is not a page view.
 */
export async function recordVisit({ visitorId, payload, userAgent, ownHost, now = new Date() }: VisitInput) {
  const agent = parseUserAgent(userAgent);
  if (agent.isBot) return;
  const path = trackablePath(payload.path);
  if (!path) return;

  await db.visitorPresence.upsert({ where: { visitorId }, create: { visitorId, lastSeenAt: now }, update: { lastSeenAt: now } });

  if (!payload.heartbeat) {
    const recent = await db.pageView.findFirst({
      where: { visitorId, path, createdAt: { gt: new Date(now.getTime() - DUPLICATE_WINDOW_MS) } },
      select: { id: true },
    });
    if (!recent) {
      await db.pageView.create({
        data: { visitorId, path, referrerHost: referrerHost(payload.referrer, ownHost), browser: agent.browser, device: agent.device, createdAt: now },
      });
    }
  }

  if (Math.random() < PRUNE_PROBABILITY) await pruneOldVisits(now);
}

/** Old raw rows are only ever read by aggregate queries over the recent past, so they are dropped rather than kept forever. */
export async function pruneOldVisits(now = new Date()) {
  const viewsBefore = new Date(now.getTime() - PAGE_VIEW_RETENTION_DAYS * 86_400_000);
  const presenceBefore = new Date(now.getTime() - 86_400_000);
  await Promise.all([
    db.pageView.deleteMany({ where: { createdAt: { lt: viewsBefore } } }),
    db.visitorPresence.deleteMany({ where: { lastSeenAt: { lt: presenceBefore } } }),
  ]);
}
