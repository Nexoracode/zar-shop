import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { requirePermission } from "@/modules/auth/session";
import { notifyWalletCredited } from "@/modules/notifications/wallet-notifications";
import { walletAdjustmentSchema } from "@/modules/wallet/schemas";
import { creditWallet, debitWallet, WalletBalanceError } from "@/modules/wallet/wallet";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("users:manage");
    const { id } = await context.params;
    const target = await db.user.findUnique({ where: { id }, select: { id: true, isGuest: true } });
    if (!target || target.isGuest) return NextResponse.json({ message: "کاربر پیدا نشد." }, { status: 404 });
    const input = walletAdjustmentSchema.parse(await request.json());

    const balance = await db.$transaction(async (tx) => {
      const move = input.direction === "credit" ? creditWallet : debitWallet;
      const nextBalance = await move(tx, {
        userId: target.id,
        amount: input.amount,
        type: input.direction === "credit" ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
        description: input.reason,
        actorId: actor.id,
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "WALLET_ADJUSTMENT",
          entityType: "Wallet",
          entityId: target.id,
          ...auditRequestContext(request, { direction: input.direction, amount: input.amount, reason: input.reason }),
        },
      });
      return nextBalance;
    });

    if (input.direction === "credit") {
      try { await notifyWalletCredited(db, { userId: target.id, amount: input.amount, reason: "تعدیل توسط پشتیبانی" }); } catch (error) { console.error("[notifications] Wallet-adjustment notification failed.", error); }
    }

    return NextResponse.json({ balance: balance.toString() });
  } catch (error) {
    if (error instanceof WalletBalanceError) return NextResponse.json({ message: error.message }, { status: 409 });
    return apiError(error);
  }
}
