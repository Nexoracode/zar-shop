import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { decryptGatewayCredential } from "@/modules/payments/gateway-config";
import { getPaymentProvider, ZarinpalPaymentProvider, type PaymentProvider } from "@/modules/payments/payment-provider";

export const storefrontPaymentMethodSchema = z.enum(["mock", "zarinpal"]);
export type StorefrontPaymentMethodId = z.infer<typeof storefrontPaymentMethodSchema>;
export type StorefrontPaymentMethod = { id: StorefrontPaymentMethodId; name: string; description: string; sandbox: boolean };

export async function getStorefrontPaymentMethods(): Promise<StorefrontPaymentMethod[]> {
  const zarinpal = await db.paymentGatewayConfig.findUnique({ where: { provider: "ZARINPAL" }, select: { displayName: true, isSandbox: true } });
  if (zarinpal) return [{ id: "zarinpal", name: zarinpal.displayName, description: "پرداخت آنلاین با همه کارت‌های عضو شتاب", sandbox: zarinpal.isSandbox }];
  if (env.PAYMENT_PROVIDER === "zarinpal") return [{ id: "zarinpal", name: "زرین‌پال", description: "پرداخت آنلاین با همه کارت‌های عضو شتاب", sandbox: env.ZARINPAL_SANDBOX }];
  return [{ id: "mock", name: "درگاه آزمایشی", description: "شبیه‌سازی پرداخت برای محیط توسعه", sandbox: true }];
}

export async function getStorefrontPaymentProvider(method: string): Promise<PaymentProvider> {
  const parsed = storefrontPaymentMethodSchema.parse(method);
  if (parsed === "mock") {
    if (env.PAYMENT_PROVIDER !== "mock") throw new Error("Mock payment is not available");
    return getPaymentProvider("mock");
  }
  const config = await db.paymentGatewayConfig.findUnique({ where: { provider: "ZARINPAL" } });
  if (config) return new ZarinpalPaymentProvider({ merchantId: decryptGatewayCredential(config.credentialEncrypted), sandbox: config.isSandbox });
  if (env.PAYMENT_PROVIDER === "zarinpal") return getPaymentProvider("zarinpal");
  throw new Error("Selected payment method is not available");
}
