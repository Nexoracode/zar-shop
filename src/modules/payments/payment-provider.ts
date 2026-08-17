import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";

export type PaymentRequest = { amount: number; orderId: string; callbackUrl: string; description?: string; mobile?: string; email?: string };
export type PaymentResult = { authority: string; redirectUrl: string };

export interface PaymentProvider {
  request(input: PaymentRequest): Promise<PaymentResult>;
  verify(authority: string, amount: number): Promise<{ referenceId: string }>;
}

const responseSchema = z.object({
  data: z.object({
    code: z.number(),
    authority: z.string().optional(),
    ref_id: z.union([z.number(), z.string()]).optional(),
  }).optional(),
  errors: z.union([
    z.array(z.unknown()),
    z.object({ code: z.number().optional(), message: z.string().optional() }),
  ]).optional(),
});

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    public readonly operation: "request" | "verify",
    public readonly code?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "PaymentProviderError";
  }
}

type ZarinpalConfig = { merchantId: string; sandbox: boolean; timeoutMs?: number };

export class ZarinpalPaymentProvider implements PaymentProvider {
  private readonly apiBase: string;
  private readonly paymentBase: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ZarinpalConfig) {
    this.apiBase = config.sandbox ? "https://sandbox.zarinpal.com/pg/v4/payment" : "https://api.zarinpal.com/pg/v4/payment";
    this.paymentBase = config.sandbox ? "https://sandbox.zarinpal.com/pg/StartPay" : "https://www.zarinpal.com/pg/StartPay";
    this.timeoutMs = config.timeoutMs ?? 10_000;
  }

  private async post(path: "request" | "verify", body: Record<string, unknown>) {
    try {
      const response = await fetch(`${this.apiBase}/${path}.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) throw new PaymentProviderError(`Zarinpal HTTP ${response.status}`, path);
      const parsed = responseSchema.safeParse(await response.json());
      if (!parsed.success) throw new PaymentProviderError("Zarinpal returned an invalid response", path);
      return parsed.data;
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      throw new PaymentProviderError("Zarinpal is temporarily unavailable", path, undefined, { cause: error });
    }
  }

  async request(input: PaymentRequest): Promise<PaymentResult> {
    if (!Number.isSafeInteger(input.amount) || input.amount < 1) throw new Error("Invalid Zarinpal payment amount");
    const metadata = { ...(input.mobile ? { mobile: input.mobile } : {}), ...(input.email ? { email: input.email } : {}) };
    const result = await this.post("request", {
      merchant_id: this.config.merchantId,
      amount: input.amount,
      callback_url: input.callbackUrl,
      description: input.description ?? `پرداخت سفارش ${input.orderId}`,
      ...(Object.keys(metadata).length ? { metadata } : {}),
    });
    if (result.data?.code !== 100 || !result.data.authority) {
      const code = !Array.isArray(result.errors) ? result.errors?.code : undefined;
      throw new PaymentProviderError(`Zarinpal request rejected${code === undefined ? "" : ` (${code})`}`, "request", code);
    }
    return { authority: result.data.authority, redirectUrl: `${this.paymentBase}/${encodeURIComponent(result.data.authority)}` };
  }

  async verify(authority: string, amount: number): Promise<{ referenceId: string }> {
    if (!authority || !Number.isSafeInteger(amount) || amount < 1) throw new Error("Invalid Zarinpal verification input");
    const result = await this.post("verify", { merchant_id: this.config.merchantId, amount, authority });
    if (![100, 101].includes(result.data?.code ?? 0) || result.data?.ref_id === undefined) {
      const code = result.data?.code ?? (!Array.isArray(result.errors) ? result.errors?.code : undefined);
      throw new PaymentProviderError(`Zarinpal verification rejected${code === undefined ? "" : ` (${code})`}`, "verify", code);
    }
    return { referenceId: String(result.data.ref_id) };
  }
}

class MockPaymentProvider implements PaymentProvider {
  async request(input: PaymentRequest) {
    const authority = randomUUID();
    return { authority, redirectUrl: `${input.callbackUrl}?authority=${authority}&status=OK&mock=1` };
  }
  async verify() { return { referenceId: `MOCK-${Date.now()}` }; }
}

export function getPaymentProvider(provider: string = env.PAYMENT_PROVIDER): PaymentProvider {
  if (provider === "mock") return new MockPaymentProvider();
  if (provider === "zarinpal") {
    if (!env.ZARINPAL_MERCHANT_ID) throw new Error("Zarinpal merchant ID is not configured");
    return new ZarinpalPaymentProvider({ merchantId: env.ZARINPAL_MERCHANT_ID, sandbox: env.ZARINPAL_SANDBOX });
  }
  throw new Error("Unsupported payment provider");
}
