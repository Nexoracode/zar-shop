import type { Prisma } from "@generated/prisma/client";
import { generalStoreSettingsDefaults } from "@/modules/settings/general-settings";
import { InventoryUnavailableError, reserveInventory } from "@/modules/orders/inventory";
import { issueNextPurchaseRewards } from "@/modules/promotions/service";

export type PaymentFinalizationResult = {
  orderId: string;
  orderNumber: string;
  phone: string | undefined;
  alreadyCompleted: boolean;
  inventoryWarning: boolean;
};

export class PaymentAmountMismatchError extends Error {
  constructor() {
    super("Payment amount does not match the order total");
    this.name = "PaymentAmountMismatchError";
  }
}

export async function finalizeVerifiedPayment(
  transaction: Prisma.TransactionClient,
  paymentId: string,
  referenceId: string,
): Promise<PaymentFinalizationResult> {
  const payment = await transaction.payment.findUnique({
    where: { id: paymentId },
    include: { order: { include: { items: true, user: true } } },
  });
  if (!payment) throw new Error("Payment not found");
  const phone = (payment.order.shippingAddress as { phone?: string } | null)?.phone;
  if (payment.status === "SUCCESS") {
    return { orderId: payment.orderId, orderNumber: payment.order.orderNumber, phone, alreadyCompleted: true, inventoryWarning: !payment.order.inventoryReserved };
  }
  if (!payment.amount.equals(payment.order.total)) throw new PaymentAmountMismatchError();

  const claimed = await transaction.payment.updateMany({
    where: { id: payment.id, status: { notIn: ["SUCCESS", "REFUNDED"] } },
    data: { status: "SUCCESS", referenceId, paidAt: new Date() },
  });
  if (claimed.count !== 1) {
    const completed = await transaction.payment.findUnique({ where: { id: payment.id }, select: { status: true } });
    if (completed?.status === "SUCCESS") {
      return { orderId: payment.orderId, orderNumber: payment.order.orderNumber, phone, alreadyCompleted: true, inventoryWarning: !payment.order.inventoryReserved };
    }
    throw new Error("Payment can no longer be finalized");
  }

  let inventoryWarning = false;
  if (!payment.order.inventoryReserved) {
    try {
      await reserveInventory(transaction, payment.order.items);
    } catch (error) {
      if (!(error instanceof InventoryUnavailableError)) throw error;
      inventoryWarning = true;
    }
  }

  const payable = await transaction.order.updateMany({
    where: { id: payment.orderId, status: { in: ["PENDING_PAYMENT", "EXPIRED", "CANCELLED"] } },
    data: { status: "PAID", expiredAt: null, inventoryReserved: !inventoryWarning },
  });
  if (payable.count !== 1 && payment.order.status !== "PAID") throw new Error("Order can no longer be paid");

  await transaction.promotionReward.updateMany({ where: { redeemedOrderId: payment.orderId, redeemedAt: null }, data: { redeemedAt: new Date() } });
  const sellerSettings = await transaction.storeSetting.findUnique({
    where: { id: "main" },
    select: { industry: true, storeName: true, supportPhone: true, supportEmail: true, storeAddress: true, legalIdentifier: true, currency: true, timezone: true },
  });
  await transaction.invoice.upsert({
    where: { orderId: payment.orderId },
    update: {},
    create: {
      invoiceNumber: `INV-${Date.now()}-${payment.orderId.slice(-6).toUpperCase()}`,
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
        phone,
        address: payment.order.shippingAddress,
      },
    },
  });
  await issueNextPurchaseRewards(transaction, {
    orderId: payment.orderId,
    userId: payment.order.userId,
    merchandiseAmount: Number(payment.order.subtotal) - Number(payment.order.productDiscount),
  });
  if (inventoryWarning) {
    await transaction.auditLog.create({
      data: {
        action: "PAID_ORDER_INVENTORY_SHORTAGE",
        entityType: "Order",
        entityId: payment.orderId,
        metadata: { orderNumber: payment.order.orderNumber, referenceId },
      },
    });
  }
  return { orderId: payment.orderId, orderNumber: payment.order.orderNumber, phone, alreadyCompleted: false, inventoryWarning };
}
