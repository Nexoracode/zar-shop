import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getStorefrontPaymentProvider } from "@/modules/payments/storefront-methods";
import { PaymentProviderError } from "@/modules/payments/payment-provider";
import { finalizeVerifiedTopup } from "@/modules/wallet/topup";

const walletUrl = (params: string) => `${env.APP_URL}/account/wallet${params}`;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authority = url.searchParams.get("Authority") ?? url.searchParams.get("authority");
  const status = url.searchParams.get("Status") ?? url.searchParams.get("status");
  if (!authority) return NextResponse.redirect(walletUrl("?topup=cancelled"));

  const topup = await db.walletTopup.findUnique({ where: { authority } });
  if (!topup) return NextResponse.redirect(walletUrl("?topup=missing"));
  if (topup.status === "SUCCESS") return NextResponse.redirect(walletUrl("?topup=success"));

  // As in the order-payment callback, the gateway's own verify() is the only financial source of
  // truth — a forged `Status` never settles or cancels a top-up on its own.
  let referenceId: string;
  try {
    referenceId = (await (await getStorefrontPaymentProvider(topup.provider)).verify(authority, Number(topup.amount))).referenceId;
  } catch (error) {
    const providerCode = error instanceof PaymentProviderError ? error.code ?? null : null;
    if (status !== "OK") {
      // Logged even though this is the "user cancelled" path: a gateway that captured the money
      // but still failed verify() lands here too, and without this line there is no trace of why.
      console.error(`[wallet] Top-up not verified (gateway status=${status ?? "none"}, code=${providerCode ?? "none"}).`, error);
      await db.walletTopup.updateMany({ where: { id: topup.id, status: { notIn: ["SUCCESS", "REFUNDED"] } }, data: { status: "CANCELLED", providerData: { cancelledAfterVerifyError: true, verificationErrorCode: providerCode } } });
      return NextResponse.redirect(walletUrl("?topup=cancelled"));
    }
    console.error("[wallet] Top-up verification could not be completed.", error);
    await db.walletTopup.updateMany({
      where: { id: topup.id, status: { not: "SUCCESS" } },
      data: { status: "PENDING", providerData: { verificationPending: true, verificationErrorCode: error instanceof PaymentProviderError ? error.code ?? null : null } },
    });
    return NextResponse.redirect(walletUrl("?topup=review"));
  }

  try {
    await db.$transaction((tx) => finalizeVerifiedTopup(tx, topup.id, referenceId));
    return NextResponse.redirect(walletUrl("?topup=success"));
  } catch (error) {
    console.error("[wallet] Top-up verified but local finalization needs a retry.", error);
    await db.walletTopup.updateMany({ where: { id: topup.id, status: { not: "SUCCESS" } }, data: { status: "PENDING", providerData: { verifiedReferenceId: referenceId, finalizationPending: true } } });
    return NextResponse.redirect(walletUrl("?topup=review"));
  }
}
