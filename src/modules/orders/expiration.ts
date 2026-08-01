import { db } from "@/lib/db";
import { getOrderSettings } from "@/modules/settings/order-settings";
import { sendAutomatedSms } from "@/modules/communications/sms-service";

export type ExpirationRunResult = { inspected: number; expired: number; cancelled: number; notified: number };

export async function expirePendingOrders(now = new Date()): Promise<ExpirationRunResult> {
  const settings = await getOrderSettings();
  const result: ExpirationRunResult = { inspected: 0, expired: 0, cancelled: 0, notified: 0 };
  if (!settings.orderExpirationEnabled) return result;

  const candidates = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", expiresAt: { lte: now }, expirationHandledAt: null, payments: { none: { status: "SUCCESS" } } },
    select: { id: true, orderNumber: true, user: { select: { phone: true } } },
    take: 100,
    orderBy: { expiresAt: "asc" },
  });
  result.inspected = candidates.length;

  for (const order of candidates) {
    const handled = await db.$transaction(async (transaction) => {
      const nextStatus = settings.orderExpirationAction === "EXPIRE" ? "EXPIRED" : settings.orderExpirationAction === "CANCEL" ? "CANCELLED" : undefined;
      const updated = await transaction.order.updateMany({
        where: { id: order.id, status: "PENDING_PAYMENT", expiresAt: { lte: now }, expirationHandledAt: null, payments: { none: { status: "SUCCESS" } } },
        data: { ...(nextStatus ? { status: nextStatus, expiredAt: now } : {}), expirationHandledAt: now },
      });
      if (updated.count !== 1) return false;

      if (nextStatus) {
        await transaction.payment.updateMany({ where: { orderId: order.id, status: { in: ["INITIATED", "PENDING"] } }, data: { status: "CANCELLED" } });
        if (settings.restorePromotionOnExpiry) {
          await transaction.promotionReward.updateMany({ where: { redeemedOrderId: order.id, redeemedAt: null }, data: { redeemedOrderId: null } });
          await transaction.promotionRedemption.deleteMany({ where: { orderId: order.id } });
        }
      }
      await transaction.auditLog.create({
        data: {
          action: nextStatus ? "ORDER_AUTO_EXPIRED" : "ORDER_EXPIRATION_NOTIFICATION",
          entityType: "Order",
          entityId: order.id,
          metadata: { orderNumber: order.orderNumber, action: settings.orderExpirationAction, releaseReservedInventory: settings.releaseReservedInventory, restorePromotion: settings.restorePromotionOnExpiry },
        },
      });
      return true;
    });
    if (!handled) continue;
    try { await sendAutomatedSms("orderExpired", order.user.phone, { orderNumber: order.orderNumber }); } catch (smsError) { console.error("[sms] Order-expired notification failed.", smsError); }
    if (settings.orderExpirationAction === "EXPIRE") result.expired += 1;
    else if (settings.orderExpirationAction === "CANCEL") result.cancelled += 1;
    else result.notified += 1;
  }
  return result;
}
