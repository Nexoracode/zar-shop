import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getPaymentProvider } from "@/modules/payments/payment-provider";
import type { PrismaClient } from "@generated/prisma/client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authority = url.searchParams.get("authority");
  const status = url.searchParams.get("status");
  if (!authority || status !== "OK") {
    return NextResponse.redirect(`${env.APP_URL}/account?payment=cancelled`);
  }

  const payment = await db.payment.findUnique({
    where: { authority },
    include: { order: { include: { items: true, user: true } } },
  });
  if (!payment) return NextResponse.redirect(`${env.APP_URL}/account?payment=missing`);
  if (payment.status === "SUCCESS") return NextResponse.redirect(`${env.APP_URL}/invoices/${payment.orderId}`);

  try {
    const verified = await getPaymentProvider().verify(authority, Number(payment.amount));
    await db.$transaction(async (tx) => {
      const transaction = tx as unknown as PrismaClient;
      await transaction.payment.update({
        where: { id: payment.id },
        data: { status: "SUCCESS", referenceId: verified.referenceId, paidAt: new Date() },
      });
      await transaction.order.update({ where: { id: payment.orderId }, data: { status: "PAID" } });
      for (const item of payment.order.items) {
        if (item.productId) {
          await transaction.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }
      await transaction.invoice.create({
        data: {
          invoiceNumber: `INV-${Date.now()}`,
          orderId: payment.orderId,
          sellerData: { name: "زر گالری", nationalId: "تنظیم شود", economicCode: "تنظیم شود" },
          buyerData: {
            name: `${payment.order.user.firstName ?? ""} ${payment.order.user.lastName ?? ""}`.trim(),
            nationalId: payment.order.user.nationalId,
            email: payment.order.user.email,
            address: payment.order.shippingAddress,
          },
        },
      });
      await transaction.cartItem.deleteMany({ where: { cart: { userId: payment.order.userId } } });
    });
    return NextResponse.redirect(`${env.APP_URL}/invoices/${payment.orderId}`);
  } catch {
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return NextResponse.redirect(`${env.APP_URL}/account?payment=failed`);
  }
}
