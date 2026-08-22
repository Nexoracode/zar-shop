import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { decryptGatewayCredential } from "@/modules/payments/gateway-config";
import { getPaymentProvider, ZarinpalPaymentProvider, type PaymentProvider } from "@/modules/payments/payment-provider";

export const storefrontPaymentMethodSchema = z.enum(["mock", "zarinpal"]);
export type StorefrontPaymentMethodId = z.infer<typeof storefrontPaymentMethodSchema>;
export type StorefrontPaymentMethod = { id: StorefrontPaymentMethodId; name: string; description: string; sandbox: boolean };

// The storefront must only ever offer a gateway the admin has actually registered in
// /admin/settings/payment-gateways (the PaymentGatewayConfig table) — never one configured
// only through environment variables, since the admin panel has no visibility into those and
// could show zero gateways while checkout silently accepts payments through one anyway. The
// only exception is the "mock" test gateway, and only while PAYMENT_PROVIDER=mock (the local
// dev default), so a fresh checkout still works before any real gateway is configured.
// ZIBAL/ASAN_PARDAKHT/TOOMAN can already be registered in the panel but have no PaymentProvider
// implementation yet, so they stay excluded from checkout until one exists.
export async function getStorefrontPaymentMethods(): Promise<StorefrontPaymentMethod[]> {
  const zarinpal = await db.paymentGatewayConfig.findUnique({ where: { provider: "ZARINPAL" }, select: { displayName: true, isSandbox: true } });
  if (zarinpal) return [{ id: "zarinpal", name: zarinpal.displayName, description: "پرداخت آنلاین با همه کارت‌های عضو شتاب", sandbox: zarinpal.isSandbox }];
  if (env.PAYMENT_PROVIDER === "mock") return [{ id: "mock", name: "درگاه آزمایشی", description: "شبیه‌سازی پرداخت برای محیط توسعه", sandbox: true }];
  return [];
}

export async function getStorefrontPaymentProvider(method: string): Promise<PaymentProvider> {
  const parsed = storefrontPaymentMethodSchema.parse(method);
  if (parsed === "mock") {
    if (env.PAYMENT_PROVIDER !== "mock") throw new Error("Mock payment is not available");
    return getPaymentProvider("mock");
  }
  const config = await db.paymentGatewayConfig.findUnique({ where: { provider: "ZARINPAL" } });
  if (!config) throw new Error("Selected payment method is not available");
  return new ZarinpalPaymentProvider({ merchantId: decryptGatewayCredential(config.credentialEncrypted), sandbox: config.isSandbox });
}
