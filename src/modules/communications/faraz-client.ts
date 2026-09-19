/*
 * The one place that talks HTTP to Faraz SMS (docs.farazsms.com, served from
 * api.iranpayamak.com). Sending, patterns and account calls all go through `farazRequest`, so
 * the auth header, timeout and error mapping stay identical everywhere.
 *
 * Pure of `db`/`node:crypto` on purpose: callers pass the API key in.
 */

const FARAZ_BASE_URL = "https://api.iranpayamak.com";
const FARAZ_TIMEOUT_MS = 15000;

/** A failure from Faraz (or on the way to it). `message` is Persian and safe to show an admin. */
export class FarazApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "FarazApiError";
  }
}

// Faraz documents `message` as null | string | string[] | { field: string | string[] }; the older
// endpoints spell it `messages`. Flatten whichever arrives into one readable line.
function messageText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) return value.map(messageText).filter(Boolean).join("، ") || null;
  if (value && typeof value === "object") return Object.values(value).map(messageText).filter(Boolean).join("، ") || null;
  return null;
}

function providerMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  return messageText(record.message) ?? messageText(record.messages);
}

function statusMessage(status: number, payload: unknown) {
  if (status === 401 || status === 403) return "کلید API فراز اس‌ام‌اس نامعتبر است یا دسترسی لازم را ندارد.";
  if (status === 429) return "تعداد درخواست‌ها به فراز اس‌ام‌اس از حد مجاز گذشت؛ چند لحظه بعد دوباره تلاش کنید.";
  return providerMessage(payload) ?? `درخواست به فراز اس‌ام‌اس با خطای ${status.toLocaleString("fa-IR")} مواجه شد.`;
}

// Faraz wraps most responses in {status, data, message} and returns some as a bare object or
// array, so every reader unwraps defensively instead of trusting one shape.
export function unwrapObject(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) return record.data as Record<string, unknown>;
    return record;
  }
  return {};
}

export function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = unwrapObject(payload);
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.data)) return record.data;
  return [];
}

/** Faraz's own id for an accepted send (`data` of a send response), used to look up delivery. */
export function sendRequestIdOf(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const value = Number((payload as Record<string, unknown>).data);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export async function farazRequest<T = unknown>(apiKey: string, method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${FARAZ_BASE_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json", "Api-Key": apiKey },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(FARAZ_TIMEOUT_MS),
    });
  } catch {
    throw new FarazApiError("ارتباط با فراز اس‌ام‌اس برقرار نشد؛ اتصال اینترنت سرور یا وضعیت سرویس را بررسی کنید.", 0);
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new FarazApiError(statusMessage(response.status, result), response.status);
  // Faraz's own guidance: check `status`, not just the HTTP code.
  if (result && typeof result === "object" && (result as Record<string, unknown>).status === "error") throw new FarazApiError(providerMessage(result) ?? "فراز اس‌ام‌اس درخواست را نپذیرفت.", response.status);
  return result as T;
}
