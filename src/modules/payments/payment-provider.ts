import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";

export type PaymentRequest = { amount: number; orderId: string; callbackUrl: string };
export type PaymentResult = { authority: string; redirectUrl: string };

export interface PaymentProvider {
  request(input: PaymentRequest): Promise<PaymentResult>;
  verify(authority: string, amount: number): Promise<{ referenceId: string }>;
}

class MockPaymentProvider implements PaymentProvider {
  async request(input: PaymentRequest) {
    const authority = randomUUID();
    return { authority, redirectUrl: `${input.callbackUrl}?authority=${authority}&status=OK&mock=1` };
  }
  async verify() { return { referenceId: `MOCK-${Date.now()}` }; }
}

export function getPaymentProvider(): PaymentProvider {
  if (env.PAYMENT_PROVIDER === "mock") return new MockPaymentProvider();
  throw new Error("Unsupported payment provider");
}
