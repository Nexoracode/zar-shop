import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getStorefrontPaymentProvider } from "@/modules/payments/storefront-methods";
import { finalizeVerifiedPayment } from "@/modules/payments/payment-finalization";
import { sendAutomatedSms } from "@/modules/communications/sms-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authority = url.searchParams.get("Authority") ?? url.searchParams.get("authority");
  const status = url.searchParams.get("Status") ?? url.searchParams.get("status");
  if (!authority || status !== "OK") {
    if (authority) {
      await db.payment.updateMany({ where: { authority, status: { notIn: ["SUCCESS", "REFUNDED"] } }, data: { status: "CANCELLED" } });
    }
    return NextResponse.redirect(`${env.APP_URL}/account?payment=cancelled`);
  }

  const payment = await db.payment.findUnique({ where: { authority }, include: { order: true } });
  if (!payment) return NextResponse.redirect(`${env.APP_URL}/account?payment=missing`);
  if (payment.status === "SUCCESS") return NextResponse.redirect(`${env.APP_URL}/invoices/${payment.orderId}`);
  if (!payment.amount.equals(payment.order.total)) {
    await db.payment.updateMany({ where: { id: payment.id, status: { not: "SUCCESS" } }, data: { status: "FAILED" } });
    return NextResponse.redirect(`${env.APP_URL}/account?payment=failed`);
  }

  let referenceId: string;
  try {
    referenceId = (await (await getStorefrontPaymentProvider(payment.provider)).verify(authority, Number(payment.amount))).referenceId;
  } catch {
    await db.payment.updateMany({ where: { id: payment.id, status: { not: "SUCCESS" } }, data: { status: "FAILED" } });
    return NextResponse.redirect(`${env.APP_URL}/account?payment=failed`);
  }

  try {
    const result = await db.$transaction((transaction) => finalizeVerifiedPayment(transaction, payment.id, referenceId));
    if (!result.alreadyCompleted) {
      try { await sendAutomatedSms("paymentSuccess", result.phone, { orderNumber: result.orderNumber }); } catch (smsError) { console.error("[sms] Payment-success notification failed.", smsError); }
    }
    return NextResponse.redirect(`${env.APP_URL}/invoices/${result.orderId}`);
  } catch (error) {
    console.error("[payment] Provider verified the payment, but local finalization needs a retry.", error);
    await db.payment.updateMany({
      where: { id: payment.id, status: { not: "SUCCESS" } },
      data: { status: "PENDING", providerData: { verifiedReferenceId: referenceId, finalizationPending: true } },
    });
    return NextResponse.redirect(`${env.APP_URL}/account?payment=review`);
  }
}
