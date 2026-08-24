export const defaultRequestTimeoutMs = 15_000;

/** Thrown for every failure mode below so callers can surface one message without branching. */
export class ApiRequestError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

type RequestOptions = {
  timeoutMs?: number;
  /** Message used when the response carries no `message` of its own. */
  fallbackMessage?: string;
};

/**
 * `fetch` for admin mutations, with a deadline.
 *
 * Without one, a request that never settles — a server busy recompiling, a dropped connection —
 * leaves the calling button stuck in its pending state, disabled until the page is reloaded.
 * Every failure arrives here as an `ApiRequestError` carrying a message that can be shown to the
 * user as-is.
 */
export async function requestJson<T = unknown>(url: string, init: RequestInit = {}, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = defaultRequestTimeoutMs, fallbackMessage = "درخواست انجام نشد." } = options;
  let response: Response;

  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (reason) {
    if (reason instanceof DOMException && (reason.name === "TimeoutError" || reason.name === "AbortError")) {
      throw new ApiRequestError("پاسخی از سرور دریافت نشد. اتصال خود را بررسی کنید و دوباره تلاش کنید.");
    }
    throw new ApiRequestError("ارتباط با سرور برقرار نشد.");
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof (payload as { message?: unknown } | null)?.message === "string"
      ? (payload as { message: string }).message
      : fallbackMessage;
    throw new ApiRequestError(message, response.status);
  }

  return payload as T;
}

/** Narrows any thrown value to something safe to show the user. */
export function requestErrorMessage(reason: unknown, fallback = "خطای ناشناخته") {
  return reason instanceof Error ? reason.message : fallback;
}
