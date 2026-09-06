/**
 * Report period resolution — pure, no database import, so the Blueprint filter bar (a client
 * component) can share the range vocabulary with the server without pulling Prisma into the
 * browser bundle.
 */

export const REPORT_RANGES = ["today", "week", "month", "quarter", "year"] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

export const DEFAULT_REPORT_RANGE: ReportRange = "month";

/** How many whole days each preset covers, counting today. */
const RANGE_DAYS: Record<ReportRange, number> = { today: 1, week: 7, month: 30, quarter: 90, year: 365 };

export const REPORT_RANGE_LABELS: Record<ReportRange, string> = {
  today: "امروز",
  week: "هفته",
  month: "ماه",
  quarter: "سه‌ماه",
  year: "سال",
};

export type ReportPeriod = {
  /** The active preset, or `null` when a custom from/to window is in effect. */
  range: ReportRange | null;
  custom: boolean;
  start: Date;
  end: Date;
  /** Number of day buckets the daily series should cover. */
  days: number;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Parses a `YYYY-MM-DD` value (a Gregorian calendar day) in the server's own timezone, the same
 * way the dashboard already keys its daily buckets. Anything malformed yields `null`. */
export function parseReportDate(value: string | undefined | null) {
  if (!value || !ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolveReportPeriod(params: { range?: string; from?: string; to?: string }): ReportPeriod {
  const from = parseReportDate(params.from);
  const to = parseReportDate(params.to);
  if (from && to && from.getTime() <= to.getTime()) {
    const start = startOfDay(from);
    const end = startOfDay(to);
    end.setDate(end.getDate() + 1);
    end.setMilliseconds(-1); // 23:59:59.999 of the `to` day
    const days = Math.round((startOfDay(to).getTime() - start.getTime()) / 86_400_000) + 1;
    return { range: null, custom: true, start, end, days };
  }
  const range = (REPORT_RANGES as readonly string[]).includes(params.range ?? "")
    ? (params.range as ReportRange)
    : DEFAULT_REPORT_RANGE;
  const days = RANGE_DAYS[range];
  const end = new Date();
  const start = startOfDay(end);
  start.setDate(start.getDate() - (days - 1));
  return { range, custom: false, start, end, days };
}
