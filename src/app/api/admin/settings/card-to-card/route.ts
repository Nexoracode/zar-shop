import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getPermittedActor } from "@/modules/auth/session";
import { cardToCardSettingsSchema } from "@/modules/payments/card-to-card-shared";
import { getCardToCardSettings } from "@/modules/settings/card-to-card-settings";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { auditRequestContext } from "@/modules/audit/request-context";

// Where customers are told to send their money is the most sensitive payment setting there is, so
// it is store-wide configuration (`settings:manage`, ADMIN only) rather than an order-manager task.
export async function GET() {
  if (!await getPermittedActor("settings:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getCardToCardSettings());
}

export async function PATCH(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = cardToCardSettingsSchema.parse(await request.json());
    const previous = await getCardToCardSettings();
    const data = {
      cardToCardEnabled: input.cardToCardEnabled,
      cardToCardHolderName: input.cardToCardHolderName || null,
      cardToCardCardNumber: input.cardToCardCardNumber || null,
      cardToCardSheba: input.cardToCardSheba || null,
      cardToCardBankName: input.cardToCardBankName || null,
    };
    await db.$transaction(async (transaction) => {
      await transaction.storeSetting.upsert({ where: { id: STORE_SETTING_ID }, create: { id: STORE_SETTING_ID, ...data }, update: data });
      // The full card number stays out of the log; the last four digits are enough to tell two changes apart.
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "CARD_TO_CARD_SETTINGS_UPDATE",
          entityType: "StoreSetting",
          entityId: STORE_SETTING_ID,
          ...auditRequestContext(request, {
            enabled: input.cardToCardEnabled,
            previouslyEnabled: previous.cardToCardEnabled,
            cardEndsWith: input.cardToCardCardNumber.slice(-4) || null,
            previousCardEndsWith: previous.cardToCardCardNumber.slice(-4) || null,
            holderChanged: previous.cardToCardHolderName !== input.cardToCardHolderName,
          }),
        },
      });
    });
    return NextResponse.json(await getCardToCardSettings());
  } catch (error) {
    return apiError(error);
  }
}
