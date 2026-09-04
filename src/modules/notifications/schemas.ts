import { z } from "zod";

/**
 * Notification kinds. Stored as a plain `VarChar` column (see `Promotion.itemScope` etc.) rather
 * than a Prisma enum, and validated with a zod enum at the edges. Every kind here is currently
 * produced from a promotion; the store is generic so other domains can add their own later.
 */
export const NOTIFICATION_TYPES = [
  "PROMOTION_FIRST_PURCHASE",
  "PROMOTION_NEXT_PURCHASE",
  "PROMOTION_COUPON",
  "PROMOTION_PRODUCT",
  "TICKET_MESSAGE",
  "TICKET_STATUS",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notificationPatchSchema = z
  .object({
    read: z.boolean().optional(),
    dismissed: z.boolean().optional(),
  })
  .refine((value) => value.read !== undefined || value.dismissed !== undefined, {
    message: "هیچ تغییری ارسال نشده است.",
  });

export type NotificationPatchInput = z.infer<typeof notificationPatchSchema>;

export const notificationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(0).max(50).default(20),
});
