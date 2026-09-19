import { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { ONLINE_WINDOW_MS } from "@/modules/analytics/tracking";

export const VISITOR_TREND_DAYS = 14;
export const VISITOR_PERIOD_DAYS = 30;

export type CountSlice = { key: string; count: number };

export type VisitorAnalytics = {
  online: number;
  todayViews: number;
  todayVisitors: number;
  /** Trailing-14-day page views and distinct visitors per local day, oldest first. */
  trend: Array<{ label: string; views: number; visitors: number }>;
  periodDays: number;
  periodViews: number;
  periodVisitors: number;
  browsers: CountSlice[];
  devices: CountSlice[];
  /** `key` is a referrer host, or "" for direct visits. */
  sources: CountSlice[];
};

/** `YYYY-MM-DD` for a local calendar day — the same day boundary the sales trend already uses. */
export function localDayKey(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

/** Fills a per-day series with zeros for days that had no traffic, so the chart shows a gap instead of skipping it. */
export function buildDailyTrend(rows: Array<{ day: string; views: number; visitors: number }>, start: Date, days: number) {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date(start);
    date.setDate(date.getDate() + offset);
    const row = byDay.get(localDayKey(date));
    return { label: date.toLocaleDateString("fa-IR", { day: "numeric", month: "short" }), views: row?.views ?? 0, visitors: row?.visitors ?? 0 };
  });
}

/** Keeps the largest `limit` slices and folds the rest into one "" -keyed remainder the caller can label. */
export function foldSlices(slices: CountSlice[], limit: number): { top: CountSlice[]; rest: number } {
  const sorted = [...slices].sort((a, b) => b.count - a.count);
  return { top: sorted.slice(0, limit), rest: sorted.slice(limit).reduce((sum, slice) => sum + slice.count, 0) };
}

export async function getVisitorAnalytics(now = new Date()): Promise<VisitorAnalytics> {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const trendStart = new Date(todayStart);
  trendStart.setDate(trendStart.getDate() - (VISITOR_TREND_DAYS - 1));
  const periodStart = new Date(todayStart);
  periodStart.setDate(periodStart.getDate() - (VISITOR_PERIOD_DAYS - 1));
  const onlineSince = new Date(now.getTime() - ONLINE_WINDOW_MS);
  // MySQL stores UTC; shifting by the server's own offset makes DATE() fall on the local day.
  const offsetMinutes = -now.getTimezoneOffset();

  const [online, todayViews, todayVisitorRows, trendRows, periodVisitorRows, browserGroups, deviceGroups, sourceGroups] = await Promise.all([
    db.visitorPresence.count({ where: { lastSeenAt: { gte: onlineSince } } }),
    db.pageView.count({ where: { createdAt: { gte: todayStart } } }),
    db.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`SELECT COUNT(DISTINCT visitorId) AS c FROM PageView WHERE createdAt >= ${todayStart}`),
    db.$queryRaw<Array<{ day: string; views: bigint; visitors: bigint }>>(Prisma.sql`
      SELECT DATE_FORMAT(DATE_ADD(createdAt, INTERVAL ${offsetMinutes} MINUTE), '%Y-%m-%d') AS day, COUNT(*) AS views, COUNT(DISTINCT visitorId) AS visitors
      FROM PageView WHERE createdAt >= ${trendStart} GROUP BY day`),
    db.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`SELECT COUNT(DISTINCT visitorId) AS c FROM PageView WHERE createdAt >= ${periodStart}`),
    db.pageView.groupBy({ by: ["browser"], where: { createdAt: { gte: periodStart } }, _count: { _all: true } }),
    db.pageView.groupBy({ by: ["device"], where: { createdAt: { gte: periodStart } }, _count: { _all: true } }),
    db.pageView.groupBy({ by: ["referrerHost"], where: { createdAt: { gte: periodStart } }, _count: { _all: true } }),
  ]);

  const browsers = browserGroups.map((group) => ({ key: group.browser, count: group._count._all }));
  const devices = deviceGroups.map((group) => ({ key: group.device, count: group._count._all }));
  const sources = sourceGroups.map((group) => ({ key: group.referrerHost ?? "", count: group._count._all }));

  return {
    online,
    todayViews,
    todayVisitors: Number(todayVisitorRows[0]?.c ?? 0),
    trend: buildDailyTrend(trendRows.map((row) => ({ day: row.day, views: Number(row.views), visitors: Number(row.visitors) })), trendStart, VISITOR_TREND_DAYS),
    periodDays: VISITOR_PERIOD_DAYS,
    periodViews: browsers.reduce((sum, slice) => sum + slice.count, 0),
    periodVisitors: Number(periodVisitorRows[0]?.c ?? 0),
    browsers,
    devices,
    sources,
  };
}
