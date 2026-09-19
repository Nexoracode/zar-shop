import { farazRequest, unwrapList, unwrapObject } from "@/modules/communications/faraz-client";
import { getActiveFarazProvider } from "@/modules/communications/sms-config";
import type { SmsPattern, SmsPatternInput } from "@/modules/communications/sms-pattern-schemas";

export { smsPatternCategories, smsPatternInputSchema, smsPatternVariableSchema } from "@/modules/communications/sms-pattern-schemas";
export type { SmsPattern, SmsPatternInput } from "@/modules/communications/sms-pattern-schemas";

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

async function requireFarazApiKey() {
  const provider = await getActiveFarazProvider();
  if (!provider) throw new Error("ابتدا فراز اس‌ام‌اس را با Api Key پیکربندی و فعال کنید.");
  return provider.apiKey;
}

/** Patterns of the account behind `apiKey` — usable before that key is saved (form verification). */
export async function fetchSmsPatterns(apiKey: string): Promise<SmsPattern[]> {
  const result = await farazRequest(apiKey, "GET", "/ws/v1/patterns");
  return unwrapList(result).map(normalizePattern).filter((pattern) => pattern.code);
}

export async function listSmsPatterns(): Promise<SmsPattern[]> {
  return fetchSmsPatterns(await requireFarazApiKey());
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
