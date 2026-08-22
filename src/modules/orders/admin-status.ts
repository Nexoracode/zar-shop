import type { Prisma } from "@generated/prisma/client";
import type { OrderStatus } from "@generated/prisma/enums";
import { db } from "@/lib/db";
import type { auditRequestContext } from "@/modules/audit/request-context";
import { sendAutomatedSms } from "@/modules/communications/sms-service";
import { InventoryUnavailableError, releaseInventory, reserveInventory } from "@/modules/orders/inventory";
import { getOrderSettings, orderExpiresAt, type OrderSettings } from "@/modules/settings/order-settings";

type AuditContext = ReturnType<typeof auditRequestContext>;

const inventoryReleasingStatuses = new Set<OrderStatus>(["EXPIRED", "CANCELLED", "REFUNDED"]);

export function orderStatusHoldsInventory(status: OrderStatus) {
  return !inventoryReleasingStatuses.has(status);
}

export function adminOrderStatusTiming(status: OrderStatus, settings: OrderSettings, now: Date) {
  const isPending = status === "PENDING_PAYMENT";
  const isExpired = status === "EXPIRED";
  return {
    expiresAt: isPending ? orderExpiresAt(settings, now) : null,
    expiredAt: isExpired ? now : null,
    expirationHandledAt: isExpired || status === "CANCELLED" ? now : null,
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
      if (!order) throw new AdminOrderStatusError("سفارش پیدا نشد.", 404);
      if (order.status === input.status) return { status: order.status, expiresAt: order.expiresAt, inventoryAction: "NONE" as const, orderNumber: order.orderNumber, customerPhone: order.user.phone, changed: false };

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
      return { ...updated, inventoryAction, orderNumber: order.orderNumber, customerPhone: order.user.phone, changed: true };
    });
    if (result.changed && input.status === "SHIPPED") {
      try { await sendAutomatedSms("orderShipped", result.customerPhone, { orderNumber: result.orderNumber }); } catch (error) { console.error("[sms] Order-shipped notification failed.", error); }
    }
    return { status: result.status, expiresAt: result.expiresAt, inventoryAction: result.inventoryAction };
  } catch (error) {
    if (error instanceof InventoryUnavailableError) throw new AdminOrderStatusError("برای فعال‌کردن دوباره سفارش، موجودی یک یا چند قلم کافی نیست.", 409);
    throw error;
  }
}
