import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getPaymentProvider } from "@/modules/payments/payment-provider";
import { decrementSelectedOptionStocks } from "@/modules/products/options";
import type { PrismaClient } from "@generated/prisma/client";
import { issueNextPurchaseRewards } from "@/modules/promotions/service";
import { generalStoreSettingsDefaults } from "@/modules/settings/general-settings";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authority = url.searchParams.get("authority");
  const status = url.searchParams.get("status");
  if (!authority || status !== "OK") {
    if (authority) {
      const cancelled = await db.payment.findUnique({ where: { authority }, select: { id: true, orderId: true, status: true } });
      if (cancelled && cancelled.status !== "SUCCESS") {
        await db.$transaction(async (tx) => {
          await tx.payment.update({ where: { id: cancelled.id }, data: { status: "CANCELLED" } });
          await tx.promotionReward.updateMany({ where: { redeemedOrderId: cancelled.orderId, redeemedAt: null }, data: { redeemedOrderId: null } });
          await tx.promotionRedemption.deleteMany({ where: { orderId: cancelled.orderId } });
        });
      }
    }
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
      await transaction.promotionReward.updateMany({ where: { redeemedOrderId: payment.orderId, redeemedAt: null }, data: { redeemedAt: new Date() } });
      for (const item of payment.order.items) {
        if (item.productId) {
          const currentProduct = await transaction.product.findUnique({ where: { id: item.productId }, include: { options: true } });
          if (!currentProduct) continue;
          const updatedOptions = decrementSelectedOptionStocks(currentProduct.options, item.selectedOptions, item.quantity, currentProduct.stock);
          for (const option of updatedOptions) {
            await transaction.productOption.update({ where: { id: option.id }, data: { values: option.values } });
          }
          await transaction.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }
      const sellerSettings = await transaction.storeSetting.findUnique({
        where: { id: "main" },
        select: { industry: true, storeName: true, supportPhone: true, supportEmail: true, storeAddress: true, legalIdentifier: true, currency: true, timezone: true },
      });
      await transaction.invoice.create({
        data: {
          invoiceNumber: `INV-${Date.now()}`,
          orderId: payment.orderId,
          sellerData: {
            name: sellerSettings?.storeName ?? generalStoreSettingsDefaults.storeName,
            phone: sellerSettings?.supportPhone,
            email: sellerSettings?.supportEmail,
            address: sellerSettings?.storeAddress,
            nationalId: sellerSettings?.legalIdentifier,
            economicCode: sellerSettings?.legalIdentifier,
            currency: sellerSettings?.currency ?? generalStoreSettingsDefaults.currency,
            timezone: sellerSettings?.timezone ?? generalStoreSettingsDefaults.timezone,
            industry: sellerSettings?.industry ?? generalStoreSettingsDefaults.industry,
          },
          buyerData: {
            name: payment.order.user.isGuest ? String((payment.order.shippingAddress as { recipient?: string } | null)?.recipient ?? "") : `${payment.order.user.firstName ?? ""} ${payment.order.user.lastName ?? ""}`.trim(),
            nationalId: payment.order.user.nationalId,
            email: payment.order.user.isGuest ? null : payment.order.user.email,
            phone: (payment.order.shippingAddress as { phone?: string } | null)?.phone,
            address: payment.order.shippingAddress,
          },
        },
      });
      await issueNextPurchaseRewards(transaction, {
        orderId: payment.orderId,
        userId: payment.order.userId,
        merchandiseAmount: Number(payment.order.subtotal) - Number(payment.order.productDiscount),
      });
      await transaction.cartItem.deleteMany({ where: { cart: { userId: payment.order.userId } } });
    });
    return NextResponse.redirect(`${env.APP_URL}/invoices/${payment.orderId}`);
  } catch {
    await db.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      await tx.promotionReward.updateMany({ where: { redeemedOrderId: payment.orderId, redeemedAt: null }, data: { redeemedOrderId: null } });
      await tx.promotionRedemption.deleteMany({ where: { orderId: payment.orderId } });
    });
    return NextResponse.redirect(`${env.APP_URL}/account?payment=failed`);
  }
}
