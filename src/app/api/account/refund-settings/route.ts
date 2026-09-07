import { NextResponse } from "next/server";
import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { refundSettingsSchema } from "@/modules/account/schemas";

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });
    if (user.isGuest) return NextResponse.json({ message: "برای این تنظیم ابتدا حساب دائمی ایجاد کنید." }, { status: 403 });

    const input = refundSettingsSchema.parse(await request.json());
    const current = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { bankCardNumber: true } });

    const data: Prisma.UserUpdateInput = { refundMethod: input.refundMethod };
    if (input.card) {
      data.bankCardNumber = input.card.number;
      data.bankCardHolder = input.card.holder;
      data.bankCardSheba = input.card.sheba;
    }

    // Choosing card refunds needs a card on file — either sent now or saved before.
    if (input.refundMethod === "BANK_CARD" && !input.card && !current.bankCardNumber) {
      return NextResponse.json({ message: "برای انتخاب کارت بانکی، ابتدا شمارهٔ کارت را وارد کنید." }, { status: 422 });
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data,
      select: { refundMethod: true, bankCardNumber: true, bankCardHolder: true, bankCardSheba: true },
    });
    return NextResponse.json({ refund: updated });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });
    // Removing the card also forces the method back to wallet, so no return is left pointing at
    // a card that is gone.
    await db.user.update({
      where: { id: user.id },
      data: { bankCardNumber: null, bankCardHolder: null, bankCardSheba: null, refundMethod: "WALLET" },
    });
    return NextResponse.json({ refund: { refundMethod: "WALLET", bankCardNumber: null, bankCardHolder: null, bankCardSheba: null } });
  } catch (error) {
    return apiError(error);
  }
}
