import { getActiveFarazProvider } from "@/modules/communications/sms-config";
import type { SmsPattern, SmsPatternInput } from "@/modules/communications/sms-pattern-schemas";

export { smsPatternCategories, smsPatternInputSchema, smsPatternVariableSchema } from "@/modules/communications/sms-pattern-schemas";
export type { SmsPattern, SmsPatternInput } from "@/modules/communications/sms-pattern-schemas";

// Faraz SMS's API (docs.farazsms.com / docs.iranpayamak.com) wraps some responses in
// {status, data, messages} and returns others as a bare object or array — the docs are
// inconsistent about which, so every call here unwraps defensively instead of trusting one shape.
function unwrapObject(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) return record.data as Record<string, unknown>;
    return record;
  }
  return {};
}
function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = unwrapObject(payload);
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.data)) return record.data;
  return [];
}

function normalizePattern(raw: unknown): SmsPattern {
  const record = (raw ?? {}) as Record<string, unknown>;
  const varsSource = Array.isArray(record.vars) ? record.vars : Array.isArray(record.attributes) ? record.attributes : [];
  return {
    code: String(record.code ?? record.id ?? ""),
    text: String(record.text ?? ""),
    description: record.description == null ? null : String(record.description),
    status: record.status == null ? null : String(record.status),
    website: record.website == null ? null : String(record.website),
    shared: Boolean(record.shared ?? record.share),
    category: typeof record.category === "number" ? record.category : Number.isFinite(Number(record.category)) && record.category ? Number(record.category) : null,
    vars: varsSource.map((item) => {
      const varRecord = (item ?? {}) as Record<string, unknown>;
      return { var: String(varRecord.var ?? varRecord.name ?? ""), length: Number(varRecord.length ?? 0), type: String(varRecord.type ?? "string") };
    }),
  };
}

async function farazRequest<T = unknown>(apiKey: string, method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`https://api.iranpayamak.com${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "Api-Key": apiKey },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const record = result && typeof result === "object" ? (result as Record<string, unknown>) : null;
    const providerMessage = record && typeof record.messages === "string" ? record.messages : record && typeof record.message === "string" ? record.message : null;
    throw new Error(providerMessage ?? `درخواست به فراز اس‌ام‌اس با خطای ${response.status.toLocaleString("fa-IR")} مواجه شد.`);
  }
  return result as T;
}

async function requireFarazApiKey() {
  const provider = await getActiveFarazProvider();
  if (!provider) throw new Error("ابتدا فراز اس‌ام‌اس را با Api Key پیکربندی و فعال کنید.");
  return provider.apiKey;
}

export async function listSmsPatterns(): Promise<SmsPattern[]> {
  const apiKey = await requireFarazApiKey();
  const result = await farazRequest(apiKey, "GET", "/ws/v1/patterns");
  return unwrapList(result).map(normalizePattern);
}

export async function createSmsPattern(input: SmsPatternInput): Promise<SmsPattern> {
  const apiKey = await requireFarazApiKey();
  const result = await farazRequest(apiKey, "POST", "/ws/v1/patterns", { text: input.text, description: input.description || null, share: input.shared ? 1 : 0, website: input.website, category: input.category, vars: input.vars });
  return normalizePattern(unwrapObject(result));
}

export async function updateSmsPattern(code: string, input: SmsPatternInput): Promise<SmsPattern> {
  const apiKey = await requireFarazApiKey();
  const result = await farazRequest(apiKey, "PUT", `/ws/v1/patterns/${encodeURIComponent(code)}`, { text: input.text, description: input.description || null, shared: input.shared ? 1 : 0, website: input.website, vars: input.vars });
  return normalizePattern(unwrapObject(result));
}

export async function deleteSmsPattern(code: string): Promise<void> {
  const apiKey = await requireFarazApiKey();
  await farazRequest(apiKey, "DELETE", `/ws/v1/patterns/${encodeURIComponent(code)}`);
}

export async function getSmsAccountBalance(): Promise<number | null> {
  const apiKey = await requireFarazApiKey();
  const result = await farazRequest(apiKey, "GET", "/ws/v1/account/balance");
  const record = unwrapObject(result);
  const raw = record.balance ?? record.credit ?? record.amount;
  const balance = Number(raw);
  return Number.isFinite(balance) ? balance : null;
}
