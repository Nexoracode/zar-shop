import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@generated/prisma/client";
import { attachReferral, payoutReferralIfEligible, ReferralCodeError } from "./referral-service";

function referrerLookupDb(referrer: { id: string; status: string; isGuest: boolean } | null) {
  const created: unknown[] = [];
  const db = {
    user: { findUnique: async () => referrer },
    referral: { create: async ({ data }: { data: unknown }) => { created.push(data); return data; } },
  } as unknown as Prisma.TransactionClient;
  return { db, created };
}

test("attachReferral links the referee to the code owner", async () => {
  const { db, created } = referrerLookupDb({ id: "referrer-1", status: "ACTIVE", isGuest: false });
  await attachReferral(db, { refereeId: "referee-1", code: "abc123" });
  assert.equal(created.length, 1);
  assert.deepEqual(created[0], { referrerId: "referrer-1", refereeId: "referee-1", code: "ABC123", status: "PENDING" });
});

test("attachReferral ignores an empty code", async () => {
  const { db, created } = referrerLookupDb(null);
  const result = await attachReferral(db, { refereeId: "referee-1", code: "   " });
  assert.equal(result, null);
  assert.equal(created.length, 0);
});

test("attachReferral rejects an unknown code", async () => {
  const { db } = referrerLookupDb(null);
  await assert.rejects(() => attachReferral(db, { refereeId: "referee-1", code: "NOPE" }), ReferralCodeError);
});

test("attachReferral rejects a self-referral", async () => {
  const { db } = referrerLookupDb({ id: "referee-1", status: "ACTIVE", isGuest: false });
  await assert.rejects(() => attachReferral(db, { refereeId: "referee-1", code: "SELF" }), ReferralCodeError);
});

function payoutDb(options: { referral: { id: string; referrerId: string; refereeId: string } | null }) {
  const credits: Array<{ amount: number; type: string }> = [];
  let claimed = false;
  const db = {
    referral: {
      findFirst: async () => options.referral,
      updateMany: async () => {
        if (claimed) return { count: 0 };
        claimed = true;
        return { count: 1 };
      },
    },
    storeSetting: {
      findUnique: async () => ({ referralEnabled: true, referralReferrerReward: new Prisma.Decimal(500_000), referralRefereeReward: new Prisma.Decimal(300_000), referralRewardMinOrderAmount: new Prisma.Decimal(0) }),
    },
    wallet: {
      upsert: async () => ({ id: "w", balance: new Prisma.Decimal(0) }),
      update: async ({ data }: { data: { balance: { increment: number } } }) => ({ balance: new Prisma.Decimal(data.balance.increment) }),
    },
    walletTransaction: {
      create: async ({ data }: { data: { amount: Prisma.Decimal; type: string } }) => { credits.push({ amount: Number(data.amount), type: data.type }); },
    },
    auditLog: { create: async () => undefined },
  } as unknown as Prisma.TransactionClient;
  return { db, credits };
}

test("payoutReferralIfEligible credits both wallets and is idempotent", async () => {
  const { db, credits } = payoutDb({ referral: { id: "r1", referrerId: "referrer-1", refereeId: "referee-1" } });
  const first = await payoutReferralIfEligible(db, { userId: "referee-1", orderId: "order-1", merchandiseAmount: 2_000_000 });
  assert.ok(first);
  assert.equal(first?.referrerReward, 500_000);
  assert.equal(first?.refereeReward, 300_000);
  assert.deepEqual(credits.sort((a, b) => a.type.localeCompare(b.type)), [
    { amount: 300_000, type: "REFERRAL_BONUS" },
    { amount: 500_000, type: "REFERRAL_REWARD" },
  ]);

  const second = await payoutReferralIfEligible(db, { userId: "referee-1", orderId: "order-2", merchandiseAmount: 2_000_000 });
  assert.equal(second, null);
});

test("payoutReferralIfEligible does nothing without a pending referral", async () => {
  const { db } = payoutDb({ referral: null });
  const result = await payoutReferralIfEligible(db, { userId: "referee-1", orderId: "order-1", merchandiseAmount: 2_000_000 });
  assert.equal(result, null);
});
