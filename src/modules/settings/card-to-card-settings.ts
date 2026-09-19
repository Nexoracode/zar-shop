import { cache } from "react";
import { db } from "@/lib/db";
import { detectBankName, isValidCardNumber } from "@/modules/account/bank-card";
import type { CardToCardSettings } from "@/modules/payments/card-to-card-shared";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

const select = {
  cardToCardEnabled: true,
  cardToCardHolderName: true,
  cardToCardCardNumber: true,
  cardToCardSheba: true,
  cardToCardBankName: true,
} as const;

export type { CardToCardSettings };

// `cache` dedupes this within a request — checkout, its API and the transfer page all read the one row.
export const getCardToCardSettings = cache(async (): Promise<CardToCardSettings> => {
  const existing = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select });
  const settings = existing ?? await db.storeSetting.upsert({ where: { id: STORE_SETTING_ID }, create: { id: STORE_SETTING_ID }, update: {}, select });
  return {
    cardToCardEnabled: settings.cardToCardEnabled,
    cardToCardHolderName: settings.cardToCardHolderName ?? "",
    cardToCardCardNumber: settings.cardToCardCardNumber ?? "",
    cardToCardSheba: settings.cardToCardSheba ?? "",
    cardToCardBankName: settings.cardToCardBankName ?? "",
  };
});

/** What a customer is shown on the transfer page; `null` while the method is off or half-filled. */
export type CardToCardDestination = { holderName: string; cardNumber: string; sheba: string | null; bankName: string | null };

export function cardToCardDestination(settings: CardToCardSettings): CardToCardDestination | null {
  if (!settings.cardToCardEnabled || !settings.cardToCardHolderName || !isValidCardNumber(settings.cardToCardCardNumber)) return null;
  return {
    holderName: settings.cardToCardHolderName,
    cardNumber: settings.cardToCardCardNumber,
    sheba: settings.cardToCardSheba || null,
    // The typed bank name wins; otherwise it is read off the card's first six digits when known.
    bankName: settings.cardToCardBankName || detectBankName(settings.cardToCardCardNumber),
  };
}
