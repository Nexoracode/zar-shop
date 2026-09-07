import { Prisma } from "@generated/prisma/client";
import type { PrismaClient } from "@generated/prisma/client";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { walletSettingsDefaults } from "@/modules/settings/wallet-settings";
import { normalizeReferralCode } from "@/modules/wallet/referral-code";
import { creditWallet } from "@/modules/wallet/wallet";

type DbLike = PrismaClient | Prisma.TransactionClient;

export class ReferralCodeError extends Error {
  constructor(message = "کد معرف معتبر نیست.") {
    super(message);
    this.name = "ReferralCodeError";
  }
}

/**
 * Links a freshly created account to the owner of `code`. Called from registration inside the
 * user-creation transaction. An empty code is a no-op; a non-empty but unknown/own/inactive code
 * throws {@link ReferralCodeError} so the route can turn it into a field error and roll back.
 */
export async function attachReferral(db: DbLike, input: { refereeId: string; code: string }) {
  const code = normalizeReferralCode(input.code);
  if (!code) return null;
  const referrer = await db.user.findUnique({ where: { referralCode: code }, select: { id: true, status: true, isGuest: true } });
  if (!referrer || referrer.id === input.refereeId || referrer.isGuest || referrer.status !== "ACTIVE") {
    throw new ReferralCodeError();
  }
  return db.referral.create({ data: { referrerId: referrer.id, refereeId: input.refereeId, code, status: "PENDING" } });
}

export type ReferralPayout = { referrerId: string; refereeId: string; referrerReward: number; refereeReward: number };

/**
 * Credits both wallets the first time a referred customer completes a paid order, then flips the
 * `Referral` to REWARDED. Runs inside the payment-finalization transaction. The `updateMany` claim
 * is the idempotency guard: a replayed callback finds the row already REWARDED and pays nothing.
 * A referral only ever exists for a brand-new account, so "the first paid order" is simply the
 * first time this fires while the row is still PENDING.
 */
export async function payoutReferralIfEligible(
  tx: Prisma.TransactionClient,
  input: { userId: string; orderId: string; merchandiseAmount: number },
): Promise<ReferralPayout | null> {
  const referral = await tx.referral.findFirst({ where: { refereeId: input.userId, status: "PENDING" }, select: { id: true, referrerId: true, refereeId: true } });
  if (!referral) return null;

  const settings = await tx.storeSetting.findUnique({
    where: { id: STORE_SETTING_ID },
    select: { referralEnabled: true, referralReferrerReward: true, referralRefereeReward: true, referralRewardMinOrderAmount: true },
  });
  if (!(settings?.referralEnabled ?? walletSettingsDefaults.referralEnabled)) return null;
  const minOrderAmount = Number(settings?.referralRewardMinOrderAmount ?? walletSettingsDefaults.referralRewardMinOrderAmount);
  if (input.merchandiseAmount < minOrderAmount) return null;
  const referrerReward = Number(settings?.referralReferrerReward ?? walletSettingsDefaults.referralReferrerReward);
  const refereeReward = Number(settings?.referralRefereeReward ?? walletSettingsDefaults.referralRefereeReward);

  const claimed = await tx.referral.updateMany({
    where: { id: referral.id, status: "PENDING" },
    data: { status: "REWARDED", rewardedAt: new Date(), qualifyingOrderId: input.orderId, referrerReward, refereeReward },
  });
  if (claimed.count !== 1) return null;

  if (referrerReward > 0) {
    await creditWallet(tx, { userId: referral.referrerId, amount: referrerReward, type: "REFERRAL_REWARD", description: "پاداش دعوت دوست" });
  }
  if (refereeReward > 0) {
    await creditWallet(tx, { userId: referral.refereeId, amount: refereeReward, type: "REFERRAL_BONUS", description: "هدیهٔ ثبت‌نام با کد معرف" });
  }

  await tx.auditLog.create({
    data: {
      action: "REFERRAL_REWARDED",
      entityType: "Referral",
      entityId: referral.id,
      metadata: { referrerId: referral.referrerId, refereeId: referral.refereeId, referrerReward, refereeReward, qualifyingOrderId: input.orderId },
    },
  });

  return { referrerId: referral.referrerId, refereeId: referral.refereeId, referrerReward, refereeReward };
}
