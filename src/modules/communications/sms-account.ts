import { FarazApiError, farazRequest, unwrapList, unwrapObject } from "@/modules/communications/faraz-client";
import { fetchSmsPatterns } from "@/modules/communications/sms-patterns";
import type { SmsPattern } from "@/modules/communications/sms-pattern-schemas";

/*
 * Read-only view of a Faraz SMS account: who owns it, what is left on it, which sender lines it
 * may use and which patterns it has. The admin panel uses this to verify an API key and to offer
 * real choices (lines, patterns) instead of asking for codes to be typed by hand.
 */

export type SmsAccountProfile = { displayName: string; mobile: string | null; verified: boolean | null; blocked: boolean | null; planTitle: string | null; planExpiresAt: string | null };
export type SmsAccountBalance = { amountToman: number | null; smsCount: number | null };
export type SmsLine = { number: string; title: string | null; isDedicated: boolean | null };

export type SmsAccountInspection = {
  balance: SmsAccountBalance;
  profile: SmsAccountProfile | null;
  lines: SmsLine[] | null;
  patterns: SmsPattern[] | null;
  /** Non-fatal problems: the key works, but one of the extra lookups failed. */
  warnings: string[];
  checkedAt: string;
};

function numberOrNull(value: unknown) {
  // `Number(null)` and `Number("")` are 0, which would read a missing balance as an empty wallet.
  if (value === null || value === undefined || (typeof value === "string" && !value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function booleanOrNull(value: unknown) {
  return typeof value === "boolean" ? value : value === 1 || value === "1" ? true : value === 0 || value === "0" ? false : null;
}

export function parseFarazBalance(payload: unknown): SmsAccountBalance {
  const record = unwrapObject(payload);
  // `balanceAmount` is the wallet in toman and `balanceCount` how many SMS it still covers.
  return { amountToman: numberOrNull(record.balanceAmount ?? record.balance ?? record.credit ?? record.amount), smsCount: numberOrNull(record.balanceCount) };
}

export function parseFarazProfile(payload: unknown): SmsAccountProfile | null {
  const record = unwrapObject(payload);
  const displayName = stringOrNull(record.displayName);
  if (!displayName) return null;
  const plan = record.plan && typeof record.plan === "object" ? (record.plan as Record<string, unknown>) : {};
  return { displayName, mobile: stringOrNull(record.mobile), verified: booleanOrNull(record.verified), blocked: booleanOrNull(record.blocked), planTitle: stringOrNull(plan.title), planExpiresAt: stringOrNull(plan.expiryDate) };
}

// Faraz's spec gives no response schema for the lines endpoint (only "take the `line_number`
// value from here"), so this accepts a bare list of numbers or objects and reads the usual keys.
export function parseFarazLines(payload: unknown): SmsLine[] {
  const seen = new Set<string>();
  const lines: SmsLine[] = [];
  for (const item of unwrapList(payload)) {
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : null;
    const raw = record ? record.line_number ?? record.lineNumber ?? record.number ?? record.line : item;
    const number = typeof raw === "string" || typeof raw === "number" ? String(raw).replace(/\D/g, "") : "";
    if (!number || seen.has(number)) continue;
    seen.add(number);
    lines.push({ number, title: record ? stringOrNull(record.title ?? record.name ?? record.description) : null, isDedicated: record ? booleanOrNull(record.is_dedicated ?? record.isDedicated) : null });
  }
  return lines;
}

/**
 * Checks `apiKey` and gathers everything the panel shows about the account. The balance call is
 * Faraz's documented free way to test a key, so it is the one that must succeed; profile, lines
 * and patterns failing only produce warnings.
 */
export async function inspectFarazAccount(apiKey: string): Promise<SmsAccountInspection> {
  const [balance, profile, lines, patterns] = await Promise.allSettled([
    farazRequest(apiKey, "GET", "/ws/v1/account/balance"),
    farazRequest(apiKey, "GET", "/ws/v1/account/profile"),
    farazRequest(apiKey, "GET", "/ws/v1/lines/accessible"),
    fetchSmsPatterns(apiKey),
  ]);
  if (balance.status === "rejected") throw balance.reason instanceof FarazApiError ? balance.reason : new Error("بررسی حساب فراز اس‌ام‌اس انجام نشد.");
  const warnings: string[] = [];
  const note = (label: string, result: PromiseRejectedResult) => warnings.push(`${label}: ${result.reason instanceof Error ? result.reason.message : "دریافت نشد."}`);
  if (profile.status === "rejected") note("مشخصات حساب", profile);
  if (lines.status === "rejected") note("خطوط ارسال", lines);
  if (patterns.status === "rejected") note("پترن‌ها", patterns);
  return {
    balance: parseFarazBalance(balance.value),
    profile: profile.status === "fulfilled" ? parseFarazProfile(profile.value) : null,
    lines: lines.status === "fulfilled" ? parseFarazLines(lines.value) : null,
    patterns: patterns.status === "fulfilled" ? patterns.value : null,
    warnings,
    checkedAt: new Date().toISOString(),
  };
}
