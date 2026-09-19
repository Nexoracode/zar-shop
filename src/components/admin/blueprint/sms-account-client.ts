import type { SmsAccountInspection } from "@/modules/communications/sms-account";

/** Asks the server to verify a Faraz API key (a blank key means the saved one) and read the account behind it. */
export async function requestSmsAccountInspection(apiKey?: string): Promise<SmsAccountInspection> {
  const response = await fetch("/api/admin/sms/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: apiKey || undefined }) });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message ?? "بررسی حساب فراز اس‌ام‌اس انجام نشد.");
  return result as SmsAccountInspection;
}
