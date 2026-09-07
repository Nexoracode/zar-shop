import { cache } from "react";
import { z } from "zod";
import { db } from "@/lib/db";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { walletSettingsLimits } from "@/modules/settings/settings-limits";

const money = z.coerce.number().int().min(0).max(walletSettingsLimits.maxRewardAmount);

export const walletSettingsSchema = z.object({
  walletEnabled: z.boolean(),
  walletCheckoutEnabled: z.boolean(),
  referralEnabled: z.boolean(),
  referralReferrerReward: money,
  referralRefereeReward: money,
  referralRewardMinOrderAmount: z.coerce.number().int().min(0).max(walletSettingsLimits.maxMinOrderAmount),
});

export type WalletSettings = z.infer<typeof walletSettingsSchema>;

export const walletSettingsDefaults: WalletSettings = {
  walletEnabled: true,
  walletCheckoutEnabled: true,
  referralEnabled: true,
  referralReferrerReward: 500_000,
  referralRefereeReward: 300_000,
  referralRewardMinOrderAmount: 0,
};

const select = {
  walletEnabled: true,
  walletCheckoutEnabled: true,
  referralEnabled: true,
  referralReferrerReward: true,
  referralRefereeReward: true,
  referralRewardMinOrderAmount: true,
} as const;

// `cache` dedupes this within a request — checkout, the account pages and the admin settings
// section all read the same one row.
export const getWalletSettings = cache(async (): Promise<WalletSettings> => {
  const existing = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select });
  const settings = existing ?? await db.storeSetting.upsert({
    where: { id: STORE_SETTING_ID },
    create: { id: STORE_SETTING_ID, ...walletSettingsDefaults },
    update: {},
    select,
  });
  return walletSettingsSchema.parse({
    ...settings,
    referralReferrerReward: Number(settings.referralReferrerReward),
    referralRefereeReward: Number(settings.referralRefereeReward),
    referralRewardMinOrderAmount: Number(settings.referralRewardMinOrderAmount),
  });
});
