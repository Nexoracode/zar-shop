import type { Prisma, PrismaClient } from "@generated/prisma/client";
import { getCommunicationSettings } from "@/modules/communications/communication-settings";
import { createNotification } from "@/modules/notifications/service";
import { cardToCardPagePath } from "@/modules/payments/card-to-card-shared";

type DbLike = PrismaClient | Prisma.TransactionClient;

// `Notification.body` is VarChar(500); the fixed wording around the admin's reason takes ~130 of it.
const NOTIFICATION_REASON_MAX = 300;

/**
 * In-app notice that an admin reviewed a card-to-card transfer. An approval points at the order; a
 * rejection carries the admin's reason and points straight back at the transfer page so the
 * customer can send a corrected receipt. Silently does nothing when in-app notifications are off
 * or the customer is a guest. Best-effort: callers wrap it in try/catch so a notification failure
 * never undoes the review it announces.
 */
export async function notifyCardTransferReviewed(
  db: DbLike,
  input: { userId: string; orderId: string; orderNumber: string; approved: boolean; reason?: string | null },
) {
  if (!(await getCommunicationSettings()).inAppEnabled) return;
  const user = await db.user.findUnique({ where: { id: input.userId }, select: { isGuest: true } });
  if (!user || user.isGuest) return;
  await createNotification(db, input.userId, input.approved
    ? {
      type: "PAYMENT_STATUS",
      title: "پرداخت شما تأیید شد",
      body: `پرداخت کارت‌به‌کارت سفارش ${input.orderNumber} تأیید شد و سفارش شما برای آماده‌سازی ثبت شد.`,
      ctaHref: `/account/orders/${input.orderId}`,
      dedupeKey: `card-transfer-approved:${input.orderId}`,
    }
    : {
      type: "PAYMENT_STATUS",
      title: "پرداخت شما تأیید نشد",
      body: `پرداخت کارت‌به‌کارت سفارش ${input.orderNumber} تأیید نشد${input.reason ? `: ${input.reason.slice(0, NOTIFICATION_REASON_MAX)}` : "."} می‌توانید رسید یا اطلاعات پرداخت را دوباره ارسال کنید.`,
      ctaHref: cardToCardPagePath(input.orderId),
      // A customer can be rejected more than once on the same order; each rejection is its own notice.
      dedupeKey: `card-transfer-rejected:${input.orderId}:${Date.now()}`,
    });
}
