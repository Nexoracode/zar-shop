import { Prisma } from "@generated/prisma/client";
import type { PrismaClient } from "@generated/prisma/client";
import type { WalletTransactionType } from "@generated/prisma/enums";

type DbLike = PrismaClient | Prisma.TransactionClient;

/**
 * In-store credit ("کیف پول"). One `Wallet` row per user, created lazily. `balance` is the source
 * of truth; every change also appends a signed `WalletTransaction` with a `balanceAfter` snapshot
 * so the history reads without re-summing. All amounts are whole Rial, same as every other money
 * column in the schema.
 */

export class WalletBalanceError extends Error {
  constructor(message = "موجودی کیف پول کافی نیست.") {
    super(message);
    this.name = "WalletBalanceError";
  }
}

export async function ensureWallet(db: DbLike, userId: string) {
  return db.wallet.upsert({ where: { userId }, create: { userId }, update: {}, select: { id: true, balance: true } });
}

export async function getWalletSummary(db: DbLike, userId: string) {
  const wallet = await ensureWallet(db, userId);
  return { balance: wallet.balance, transactionCount: await db.walletTransaction.count({ where: { walletId: wallet.id } }) };
}

type MovementInput = {
  userId: string;
  /** Positive whole Rial. `creditWallet` adds it, `debitWallet` subtracts it. */
  amount: number;
  type: WalletTransactionType;
  description: string;
  orderId?: string | null;
  actorId?: string | null;
};

/** Adds credit and records a positive ledger row. */
export async function creditWallet(db: DbLike, input: MovementInput) {
  if (input.amount <= 0) throw new Error("مبلغ اعتبار باید مثبت باشد.");
  const wallet = await ensureWallet(db, input.userId);
  const updated = await db.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: input.amount } }, select: { balance: true } });
  await db.walletTransaction.create({
    data: {
      walletId: wallet.id,
      amount: new Prisma.Decimal(input.amount),
      balanceAfter: updated.balance,
      type: input.type,
      description: input.description,
      orderId: input.orderId ?? null,
      actorId: input.actorId ?? null,
    },
  });
  return updated.balance;
}

/** Subtracts credit under an optimistic guard so the balance can never go negative, then records
 *  a negative ledger row. Throws {@link WalletBalanceError} when the balance no longer covers it. */
export async function debitWallet(db: DbLike, input: MovementInput) {
  if (input.amount <= 0) throw new Error("مبلغ برداشت باید مثبت باشد.");
  const wallet = await ensureWallet(db, input.userId);
  const guarded = await db.wallet.updateMany({
    where: { id: wallet.id, balance: { gte: new Prisma.Decimal(input.amount) } },
    data: { balance: { decrement: input.amount } },
  });
  if (guarded.count !== 1) throw new WalletBalanceError();
  const after = await db.wallet.findUniqueOrThrow({ where: { id: wallet.id }, select: { balance: true } });
  await db.walletTransaction.create({
    data: {
      walletId: wallet.id,
      amount: new Prisma.Decimal(-input.amount),
      balanceAfter: after.balance,
      type: input.type,
      description: input.description,
      orderId: input.orderId ?? null,
      actorId: input.actorId ?? null,
    },
  });
  return after.balance;
}

/**
 * Returns wallet credit that funded an order back to the customer and marks the wallet payment
 * row refunded. The caller guards against double refunds by only invoking this while
 * `order.walletAmount > 0`; this zeroes it in the same transaction.
 */
export async function refundOrderWallet(
  db: DbLike,
  order: { id: string; userId: string; walletAmount: Prisma.Decimal | number | string; orderNumber: string },
) {
  const amount = Number(order.walletAmount);
  if (!(amount > 0)) return;
  await creditWallet(db, { userId: order.userId, amount, type: "ORDER_REFUND", orderId: order.id, description: `بازگشت اعتبار سفارش ${order.orderNumber}` });
  await db.order.update({ where: { id: order.id }, data: { walletAmount: 0 } });
  await db.payment.updateMany({ where: { orderId: order.id, provider: "wallet", status: "SUCCESS" }, data: { status: "REFUNDED" } });
}
