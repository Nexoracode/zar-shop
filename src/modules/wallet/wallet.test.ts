import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@generated/prisma/client";
import { creditWallet, debitWallet, WalletBalanceError } from "./wallet";

function walletDb(startingBalance: number) {
  const wallet = { id: "wallet-1", userId: "user-1", balance: new Prisma.Decimal(startingBalance) };
  const ledger: Array<{ amount: string; balanceAfter: string; type: string }> = [];
  const db = {
    wallet: {
      upsert: async () => ({ id: wallet.id, balance: wallet.balance }),
      update: async ({ data }: { data: { balance: { increment?: number; decrement?: number } } }) => {
        if (data.balance.increment !== undefined) wallet.balance = wallet.balance.plus(data.balance.increment);
        if (data.balance.decrement !== undefined) wallet.balance = wallet.balance.minus(data.balance.decrement);
        return { balance: wallet.balance };
      },
      updateMany: async ({ where, data }: { where: { balance?: { gte: Prisma.Decimal } }; data: { balance: { decrement: number } } }) => {
        if (where.balance && wallet.balance.lessThan(where.balance.gte)) return { count: 0 };
        wallet.balance = wallet.balance.minus(data.balance.decrement);
        return { count: 1 };
      },
      findUniqueOrThrow: async () => ({ balance: wallet.balance }),
    },
    walletTransaction: {
      create: async ({ data }: { data: { amount: Prisma.Decimal; balanceAfter: Prisma.Decimal; type: string } }) => {
        ledger.push({ amount: data.amount.toString(), balanceAfter: data.balanceAfter.toString(), type: data.type });
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { db, wallet, ledger };
}

test("creditWallet raises the balance and records a positive ledger row", async () => {
  const { db, wallet, ledger } = walletDb(1000);
  const balance = await creditWallet(db, { userId: "user-1", amount: 500, type: "ADMIN_CREDIT", description: "test" });
  assert.equal(balance.toString(), "1500");
  assert.equal(wallet.balance.toString(), "1500");
  assert.deepEqual(ledger, [{ amount: "500", balanceAfter: "1500", type: "ADMIN_CREDIT" }]);
});

test("debitWallet lowers the balance and records a negative ledger row", async () => {
  const { db, ledger } = walletDb(1000);
  const balance = await debitWallet(db, { userId: "user-1", amount: 400, type: "ORDER_PAYMENT", description: "test" });
  assert.equal(balance.toString(), "600");
  assert.deepEqual(ledger, [{ amount: "-400", balanceAfter: "600", type: "ORDER_PAYMENT" }]);
});

test("debitWallet refuses to overdraw and leaves the balance untouched", async () => {
  const { db, wallet, ledger } = walletDb(300);
  await assert.rejects(() => debitWallet(db, { userId: "user-1", amount: 500, type: "ORDER_PAYMENT", description: "test" }), WalletBalanceError);
  assert.equal(wallet.balance.toString(), "300");
  assert.equal(ledger.length, 0);
});
