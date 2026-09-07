import type { Prisma, PrismaClient } from "@generated/prisma/client";
import { formatMoney } from "@/lib/format";
import { getCommunicationSettings } from "@/modules/communications/communication-settings";
import { createNotification } from "@/modules/notifications/service";

type DbLike = PrismaClient | Prisma.TransactionClient;

/**
 * In-app notice that a customer's wallet was credited — a referral reward, an order refund, or a
 * manual admin adjustment. Silently does nothing when in-app notifications are switched off or the
 * user is a guest. Best-effort: callers wrap it in try/catch so a notification failure never
 * rolls back the money movement it announces.
 */
export async function notifyWalletCredited(
  db: DbLike,
  input: { userId: string; amount: number; reason: string; dedupeKey?: string | null },
) {
  if (input.amount <= 0) return;
  if (!(await getCommunicationSettings()).inAppEnabled) return;
  const user = await db.user.findUnique({ where: { id: input.userId }, select: { isGuest: true } });
  if (!user || user.isGuest) return;
  await createNotification(db, input.userId, {
    type: "WALLET_CREDIT",
    title: "کیف پول شما شارژ شد",
    body: `${formatMoney(input.amount)} بابت ${input.reason} به کیف پول شما اضافه شد.`,
    ctaHref: "/account/wallet",
    dedupeKey: input.dedupeKey ?? null,
  });
}
