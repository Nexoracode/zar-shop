import type { Prisma } from "@generated/prisma/client";
import type { OrderStatus } from "@generated/prisma/enums";
import { db } from "@/lib/db";
import type { auditRequestContext } from "@/modules/audit/request-context";
import { sendAutomatedSms } from "@/modules/communications/sms-service";
import { InventoryUnavailableError, releaseInventory, reserveInventory } from "@/modules/orders/inventory";
import { canAdminMoveOrder } from "@/modules/orders/order-status-transitions";
import { getOrderSettings, orderExpiresAt, type OrderSettings } from "@/modules/settings/order-settings";
import { refundOrderWallet } from "@/modules/wallet/wallet";
import { notifyWalletCredited } from "@/modules/notifications/wallet-notifications";

type AuditContext = ReturnType<typeof auditRequestContext>;

const inventoryReleasingStatuses = new Set<OrderStatus>(["EXPIRED", "CANCELLED", "REFUNDED"]);

export function orderStatusHoldsInventory(status: OrderStatus) {
  return !inventoryReleasingStatuses.has(status);
}

/** The same three terminal states also return any wallet credit that funded the order. */
export function orderStatusReleasesFunds(status: OrderStatus) {
  return inventoryReleasingStatuses.has(status);
}

export function adminOrderStatusTiming(status: OrderStatus, settings: OrderSettings, now: Date) {
  const isPending = status === "PENDING_PAYMENT";
  const isExpired = status === "EXPIRED";
  return {
    expiresAt: isPending ? orderExpiresAt(settings, now) : null,
    expiredAt: isExpired ? now : null,
    expirationHandledAt: isExpired || status === "CANCELLED" ? now : null,
    // Stamped once, when the order first reaches DELIVERED — it's the clock the customer's
    // return window runs from. Left untouched (`undefined`) on every other transition so a
    // later status change never wipes the delivery date.
    deliveredAt: status === "DELIVERED" ? now : undefined,
  };
}

export class AdminOrderStatusError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "AdminOrderStatusError";
  }
}

export async function updateOrderStatusByAdmin(input: {
  orderId: string;
  status: OrderStatus;
  actorId: string;
  audit: AuditContext;
}) {
  const settings = await getOrderSettings();
  try {
    const result = await db.$transaction(async (transaction) => {
      const order = await transaction.order.findUnique({
        where: { id: input.orderId },
        include: { items: true, payments: { select: { status: true } }, user: { select: { phone: true } } },
      });
      const walletRefundAmount = Number(order?.walletAmount ?? 0);
      if (!order) throw new AdminOrderStatusError("سفارش پیدا نشد.", 404);
      if (order.status === input.status) return { status: order.status, expiresAt: order.expiresAt, inventoryAction: "NONE" as const, walletRefunded: 0, orderNumber: order.orderNumber, customerPhone: order.user.phone, customerId: order.userId, changed: false };
      if (!canAdminMoveOrder(order.status, input.status)) {
        throw new AdminOrderStatusError("این تغییر وضعیت برای سفارش مجاز نیست.", 409);
      }

      const shouldHoldInventory = orderStatusHoldsInventory(input.status);
      let inventoryReserved = order.inventoryReserved;
      let inventoryAction: "NONE" | "RESERVED" | "RELEASED" = "NONE";
      if (shouldHoldInventory && !inventoryReserved) {
        await reserveInventory(transaction, order.items);
        inventoryReserved = true;
        inventoryAction = "RESERVED";
      } else if (!shouldHoldInventory && inventoryReserved) {
        await releaseInventory(transaction, order.items);
        inventoryReserved = false;
        inventoryAction = "RELEASED";
      }

      const now = new Date();
      const timing = adminOrderStatusTiming(input.status, settings, now);
      const isClosingUnpaidOrder = (input.status === "EXPIRED" || input.status === "CANCELLED")
        && !order.payments.some((payment) => payment.status === "SUCCESS" || payment.status === "REFUNDED");

      if (isClosingUnpaidOrder) {
        await transaction.payment.updateMany({ where: { orderId: order.id, status: { in: ["INITIATED", "PENDING"] } }, data: { status: "CANCELLED" } });
        if (settings.restorePromotionOnExpiry) {
          await transaction.promotionReward.updateMany({ where: { redeemedOrderId: order.id, redeemedAt: null }, data: { redeemedOrderId: null } });
          await transaction.promotionRedemption.deleteMany({ where: { orderId: order.id } });
        }
      }

      // Wallet credit that funded the order goes back to the customer whenever the order is
      // expired, cancelled or refunded. The gateway share of a refund stays a manual step.
      let walletRefunded = 0;
      if (orderStatusReleasesFunds(input.status) && walletRefundAmount > 0) {
        await refundOrderWallet(transaction, { id: order.id, userId: order.userId, walletAmount: order.walletAmount, orderNumber: order.orderNumber });
        walletRefunded = walletRefundAmount;
      }

      const updated = await transaction.order.update({
        where: { id: order.id },
        data: {
          status: input.status,
          inventoryReserved,
          ...timing,
        },
        select: { status: true, expiresAt: true },
      });
      await transaction.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "ORDER_STATUS_UPDATE",
          entityType: "Order",
          entityId: order.id,
          ...input.audit,
          metadata: {
            ...input.audit.metadata,
            previousStatus: order.status,
            nextStatus: input.status,
            inventoryAction,
            paymentStatusChanged: isClosingUnpaidOrder,
          } as Prisma.InputJsonObject,
        },
      });
      return { ...updated, inventoryAction, walletRefunded, orderNumber: order.orderNumber, customerPhone: order.user.phone, customerId: order.userId, changed: true };
    });
    if (result.changed && input.status === "SHIPPED") {
      try { await sendAutomatedSms("orderShipped", result.customerPhone, { orderNumber: result.orderNumber }); } catch (error) { console.error("[sms] Order-shipped notification failed.", error); }
    }
    if (result.changed && result.walletRefunded > 0) {
      try { await notifyWalletCredited(db, { userId: result.customerId, amount: result.walletRefunded, reason: `بازگشت اعتبار سفارش ${result.orderNumber}`, dedupeKey: `order-refund:${input.orderId}` }); } catch (error) { console.error("[notifications] Wallet-refund notification failed.", error); }
    }
    return { status: result.status, expiresAt: result.expiresAt, inventoryAction: result.inventoryAction };
  } catch (error) {
    if (error instanceof InventoryUnavailableError) throw new AdminOrderStatusError("برای فعال‌کردن دوباره سفارش، موجودی یک یا چند قلم کافی نیست.", 409);
    throw error;
  }
}
