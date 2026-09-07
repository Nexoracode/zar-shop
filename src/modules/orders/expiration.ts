import { db } from "@/lib/db";
import { getOrderSettings } from "@/modules/settings/order-settings";
import { sendAutomatedSms } from "@/modules/communications/sms-service";
import { releaseInventory } from "@/modules/orders/inventory";
import { refundOrderWallet } from "@/modules/wallet/wallet";
import { notifyWalletCredited } from "@/modules/notifications/wallet-notifications";

export type ExpirationRunResult = { inspected: number; expired: number; cancelled: number; notified: number };

export async function expirePendingOrders(now = new Date()): Promise<ExpirationRunResult> {
  const settings = await getOrderSettings();
  const result: ExpirationRunResult = { inspected: 0, expired: 0, cancelled: 0, notified: 0 };
  if (!settings.orderExpirationEnabled) return result;

  const candidates = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", expiresAt: { lte: now }, expirationHandledAt: null, payments: { none: { provider: { not: "wallet" }, status: "SUCCESS" } } },
    select: { id: true, orderNumber: true, userId: true, walletAmount: true, inventoryReserved: true, items: true, user: { select: { phone: true } } },
    take: 100,
    orderBy: { expiresAt: "asc" },
  });
  result.inspected = candidates.length;
  // `expirePendingOrders` runs inline on hot paths (checkout, cart, account pages), so the
  // notifications are collected here and dispatched together instead of one blocking
  // round-trip per order.
  const notifications: Array<{ phone: string | null; orderNumber: string }> = [];

  for (const order of candidates) {
    const handled = await db.$transaction(async (transaction) => {
      const nextStatus = settings.orderExpirationAction === "EXPIRE" ? "EXPIRED" : settings.orderExpirationAction === "CANCEL" ? "CANCELLED" : undefined;
      const updated = await transaction.order.updateMany({
        where: { id: order.id, status: "PENDING_PAYMENT", expiresAt: { lte: now }, expirationHandledAt: null, payments: { none: { provider: { not: "wallet" }, status: "SUCCESS" } } },
        data: {
          ...(nextStatus ? { status: nextStatus, expiredAt: now } : {}),
          ...(nextStatus && settings.releaseReservedInventory && order.inventoryReserved ? { inventoryReserved: false } : {}),
          expirationHandledAt: now,
        },
      });
      if (updated.count !== 1) return false;

      if (nextStatus) {
        if (settings.releaseReservedInventory && order.inventoryReserved) await releaseInventory(transaction, order.items);
        await transaction.payment.updateMany({ where: { orderId: order.id, status: { in: ["INITIATED", "PENDING"] } }, data: { status: "CANCELLED" } });
        if (Number(order.walletAmount) > 0) {
          await refundOrderWallet(transaction, { id: order.id, userId: order.userId, walletAmount: order.walletAmount, orderNumber: order.orderNumber });
        }
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
    notifications.push({ phone: order.user.phone, orderNumber: order.orderNumber });
    if (Number(order.walletAmount) > 0 && settings.orderExpirationAction !== "NOTIFY") {
      try { await notifyWalletCredited(db, { userId: order.userId, amount: Number(order.walletAmount), reason: `بازگشت اعتبار سفارش ${order.orderNumber}`, dedupeKey: `order-refund:${order.id}` }); } catch (error) { console.error("[notifications] Wallet-refund notification failed.", error); }
    }
    if (settings.orderExpirationAction === "EXPIRE") result.expired += 1;
    else if (settings.orderExpirationAction === "CANCEL") result.cancelled += 1;
    else result.notified += 1;
  }

  const sent = await Promise.allSettled(notifications
    .map(({ phone, orderNumber }) => sendAutomatedSms("orderExpired", phone, { orderNumber })));
  for (const outcome of sent) {
    if (outcome.status === "rejected") console.error("[sms] Order-expired notification failed.", outcome.reason);
  }
  return result;
}
