import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getStorefrontPaymentMethods, getStorefrontPaymentProvider, type StorefrontPaymentMethodId } from "@/modules/payments/storefront-methods";
import { getWalletSettings } from "@/modules/settings/wallet-settings";
import { creditWallet } from "@/modules/wallet/wallet";

export class WalletTopupError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "WalletTopupError";
  }
}

export const WALLET_TOPUP_CALLBACK = "/api/wallet/topup/callback";

/** Creates a top-up record and hands back the gateway redirect. Mirrors the order-payment start
 *  flow but against `WalletTopup` instead of `Payment`, since a top-up has no order. */
export async function startWalletTopup(input: { userId: string; amount: number; paymentProvider: StorefrontPaymentMethodId; mobile?: string | null; email?: string | null }) {
  const settings = await getWalletSettings();
  if (!settings.walletEnabled || !settings.walletTopupEnabled) throw new WalletTopupError("افزایش اعتبار کیف پول در حال حاضر غیرفعال است.", 503);
  if (input.amount < settings.walletMinTopup) throw new WalletTopupError(`حداقل مبلغ افزایش اعتبار ${settings.walletMinTopup.toLocaleString("fa-IR")} ریال است.`, 422);
  if (input.amount > settings.walletMaxTopup) throw new WalletTopupError(`حداکثر مبلغ افزایش اعتبار ${settings.walletMaxTopup.toLocaleString("fa-IR")} ریال است.`, 422);

  const methods = await getStorefrontPaymentMethods();
  if (!methods.some((method) => method.id === input.paymentProvider)) throw new WalletTopupError("روش پرداخت انتخاب‌شده در دسترس نیست.", 422);
  const provider = await getStorefrontPaymentProvider(input.paymentProvider);

  const topup = await db.walletTopup.create({ data: { userId: input.userId, amount: input.amount, provider: input.paymentProvider, status: "INITIATED" } });
  try {
    const request = await provider.request({
      amount: input.amount,
      orderId: topup.id,
      callbackUrl: `${env.APP_URL}${WALLET_TOPUP_CALLBACK}`,
      description: `افزایش اعتبار کیف پول`,
      mobile: input.mobile ?? undefined,
      email: input.email ?? undefined,
    });
    await db.walletTopup.update({ where: { id: topup.id }, data: { authority: request.authority, status: "PENDING" } });
    return { redirectUrl: request.redirectUrl };
  } catch (error) {
    await db.walletTopup.deleteMany({ where: { id: topup.id, status: "INITIATED" } });
    throw error;
  }
}

export type WalletTopupFinalizationResult = { userId: string; amount: number; alreadyCompleted: boolean };

/** Claims a verified top-up and credits the wallet exactly once. The `updateMany` status claim is
 *  the idempotency guard for a replayed callback. */
export async function finalizeVerifiedTopup(tx: Prisma.TransactionClient, topupId: string, referenceId: string): Promise<WalletTopupFinalizationResult> {
  const topup = await tx.walletTopup.findUnique({ where: { id: topupId }, select: { id: true, userId: true, amount: true, status: true } });
  if (!topup) throw new Error("Wallet top-up not found");
  const amount = Number(topup.amount);
  if (topup.status === "SUCCESS") return { userId: topup.userId, amount, alreadyCompleted: true };

  const claimed = await tx.walletTopup.updateMany({
    where: { id: topup.id, status: { notIn: ["SUCCESS", "REFUNDED"] } },
    data: { status: "SUCCESS", referenceId, paidAt: new Date() },
  });
  if (claimed.count !== 1) {
    const current = await tx.walletTopup.findUnique({ where: { id: topup.id }, select: { status: true } });
    if (current?.status === "SUCCESS") return { userId: topup.userId, amount, alreadyCompleted: true };
    throw new Error("Wallet top-up can no longer be finalized");
  }

  await creditWallet(tx, { userId: topup.userId, amount, type: "TOPUP", description: "افزایش اعتبار از درگاه پرداخت" });
  return { userId: topup.userId, amount, alreadyCompleted: false };
}
