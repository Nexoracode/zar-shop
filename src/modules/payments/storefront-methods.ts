import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { CARD_TO_CARD_PROVIDER } from "@/modules/payments/card-to-card-shared";
import { decryptGatewayCredential } from "@/modules/payments/gateway-config";
import { getPaymentProvider, ZarinpalPaymentProvider, type PaymentProvider } from "@/modules/payments/payment-provider";
import { cardToCardDestination, getCardToCardSettings } from "@/modules/settings/card-to-card-settings";

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
// A registered gateway the admin switched off (`isActive: false`) is not offered either.
export async function getStorefrontPaymentMethods(): Promise<StorefrontPaymentMethod[]> {
  const zarinpal = await db.paymentGatewayConfig.findFirst({ where: { provider: "ZARINPAL", isActive: true }, select: { displayName: true, isSandbox: true } });
  if (zarinpal) return [{ id: "zarinpal", name: zarinpal.displayName, description: "پرداخت آنلاین با همه کارت‌های عضو شتاب", sandbox: zarinpal.isSandbox }];
  if (env.PAYMENT_PROVIDER === "mock") return [{ id: "mock", name: "درگاه آزمایشی", description: "شبیه‌سازی پرداخت برای محیط توسعه", sandbox: true }];
  return [];
}

/**
 * What the order checkout offers: the online gateways above plus card-to-card when the admin has
 * switched it on and filled in a destination card. Kept apart from `getStorefrontPaymentMethods`
 * because the wallet top-up shares that one and a top-up has no manual-review step, so it must
 * never be offered a transfer.
 */
export const checkoutPaymentMethodSchema = z.enum(["mock", "zarinpal", CARD_TO_CARD_PROVIDER]);
export type CheckoutPaymentMethodId = z.infer<typeof checkoutPaymentMethodSchema>;
export type CheckoutPaymentMethod = Omit<StorefrontPaymentMethod, "id"> & { id: CheckoutPaymentMethodId };

export async function getCheckoutPaymentMethods(): Promise<CheckoutPaymentMethod[]> {
  const [gateways, cardToCard] = await Promise.all([getStorefrontPaymentMethods(), getCardToCardSettings()]);
  const destination = cardToCardDestination(cardToCard);
  return destination
    ? [...gateways, { id: CARD_TO_CARD_PROVIDER, name: "کارت‌به‌کارت", description: "واریز به کارت فروشگاه و ارسال رسید یا اطلاعات پرداخت", sandbox: false }]
    : gateways;
}

/** Card-to-card is settled by an admin, not a gateway: it skips the `online payment` switch and `getStorefrontPaymentProvider`. */
export function isCardToCardMethod(method: string): boolean {
  return method === CARD_TO_CARD_PROVIDER;
}

// Deliberately does not check `isActive`: the payment callbacks also resolve the provider here to
// verify a payment that was started before the gateway was switched off, and that must still work.
// Starting a *new* payment is gated by `getStorefrontPaymentMethods()` at each call site.
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
