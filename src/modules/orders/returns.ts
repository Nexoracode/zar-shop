import { z } from "zod";
import type { Prisma } from "@generated/prisma/client";
import type { OrderStatus, ReturnStatus } from "@generated/prisma/enums";
import { db } from "@/lib/db";
import { notifyWalletCredited } from "@/modules/notifications/wallet-notifications";
import type { UploadedReturnFile } from "@/modules/orders/return-attachments";
import { returnLimits } from "@/modules/orders/return-limits";
import { getOrderSettings } from "@/modules/settings/order-settings";
import { creditWallet } from "@/modules/wallet/wallet";

/** Re-exported so existing server call sites keep their import path; the numbers live in `return-limits`. */
export const returnAdminNoteMaxLength = returnLimits.adminNoteMax;
export const returnReasonMinLength = returnLimits.reasonMin;
export const returnReasonMaxLength = returnLimits.reasonMax;

/** A return in one of these states blocks a second request for the same order. */
export const activeReturnStatuses: readonly ReturnStatus[] = ["PENDING", "APPROVED"];

const DAY_MS = 86_400_000;

/** Decision states an admin can move a return into (everything except the initial `PENDING`). */
export const returnDecisionStatuses = ["APPROVED", "REJECTED", "COMPLETED"] as const;
export type ReturnDecisionStatus = (typeof returnDecisionStatuses)[number];

/** Which current states each target decision may be reached from. */
const allowedTransitions: Record<ReturnDecisionStatus, ReturnStatus[]> = {
  APPROVED: ["PENDING"],
  REJECTED: ["PENDING", "APPROVED"],
  COMPLETED: ["APPROVED"],
};

export const returnStatusUpdateSchema = z.object({
  status: z.enum(returnDecisionStatuses),
  adminNote: z.string().trim().max(returnAdminNoteMaxLength).nullable().optional(),
});
export type ReturnStatusUpdateInput = z.infer<typeof returnStatusUpdateSchema>;

export class ReturnStatusError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "ReturnStatusError";
  }
}

// —— customer-facing: creating a return request ——

export const returnRequestItemSchema = z.object({
  orderItemId: z.string().cuid(),
  quantity: z.coerce.number().int().min(1).max(1000),
});

export const returnRequestSchema = z.object({
  orderId: z.string().cuid(),
  reason: z.string().trim().min(returnReasonMinLength).max(returnReasonMaxLength),
  items: z.array(returnRequestItemSchema).min(1).max(50),
});
export type ReturnRequestInput = z.infer<typeof returnRequestSchema>;

export type ReturnEligibility =
  | { eligible: true; deadline: Date }
  | { eligible: false; reason: string; deadline: Date | null };

/**
 * Whether a delivered order is still inside its return window. `deliveredAt` is the clock start;
 * orders delivered before that field existed cannot be returned online and are told to call support.
 */
export function evaluateReturnEligibility(
  order: { status: OrderStatus; deliveredAt: Date | null },
  windowDays: number,
  now: Date = new Date(),
): ReturnEligibility {
  if (order.status !== "DELIVERED") {
    return { eligible: false, reason: "فقط برای سفارش‌های تحویل‌شده می‌توان درخواست مرجوعی ثبت کرد.", deadline: null };
  }
  if (!order.deliveredAt) {
    return { eligible: false, reason: "زمان تحویل این سفارش ثبت نشده است؛ برای مرجوعی با پشتیبانی تماس بگیرید.", deadline: null };
  }
  const deadline = new Date(order.deliveredAt.getTime() + windowDays * DAY_MS);
  if (now.getTime() > deadline.getTime()) {
    return { eligible: false, reason: `مهلت ${windowDays.toLocaleString("fa-IR")} روزهٔ ثبت مرجوعی این سفارش به پایان رسیده است.`, deadline };
  }
  return { eligible: true, deadline };
}

/**
 * Creates a return request for specific order lines. `orderId` and item ids are references — the
 * order is re-read under the session's `userId`, eligibility and per-line quantities are checked
 * server-side, and a duplicate active request is rejected.
 */
export async function createReturnRequest(input: ReturnRequestInput, userId: string, attachments: UploadedReturnFile[] = []) {
  const settings = await getOrderSettings();

  return db.$transaction(async (tx) => {
    const [order, customer] = await Promise.all([
      tx.order.findFirst({
        where: { id: input.orderId, userId },
        select: {
          id: true,
          status: true,
          deliveredAt: true,
          items: { select: { id: true, quantity: true } },
          returns: { where: { status: { in: [...activeReturnStatuses] } }, select: { id: true } },
        },
      }),
      tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { refundMethod: true, bankCardNumber: true, bankCardHolder: true, bankCardSheba: true },
      }),
    ]);
    if (!order) throw new ReturnStatusError("سفارش پیدا نشد.", 404);

    // Snapshot the refund destination now; a later profile change must not rewrite an open return.
    if (customer.refundMethod === "BANK_CARD" && !customer.bankCardNumber) {
      throw new ReturnStatusError("برای ثبت مرجوعی، ابتدا روش بازگرداندن وجه را در «حساب کاربری ← اطلاعات حساب» تکمیل کنید.", 409);
    }

    const eligibility = evaluateReturnEligibility(order, settings.returnWindowDays);
    if (!eligibility.eligible) throw new ReturnStatusError(eligibility.reason, 409);
    if (order.returns.length > 0) throw new ReturnStatusError("برای این سفارش یک درخواست مرجوعی در حال بررسی دارید.", 409);

    // Merge duplicate lines the client may have sent, then check each against the order.
    const merged = new Map<string, number>();
    for (const line of input.items) merged.set(line.orderItemId, (merged.get(line.orderItemId) ?? 0) + line.quantity);

    const orderedById = new Map(order.items.map((item) => [item.id, item.quantity]));
    const priorReturned = await tx.returnItem.groupBy({
      by: ["orderItemId"],
      where: { orderItemId: { in: [...merged.keys()] }, return: { status: { not: "REJECTED" } } },
      _sum: { quantity: true },
    });
    const priorById = new Map(priorReturned.map((row) => [row.orderItemId, row._sum.quantity ?? 0]));

    for (const [orderItemId, quantity] of merged) {
      const ordered = orderedById.get(orderItemId);
      if (ordered === undefined) throw new ReturnStatusError("یکی از کالاهای انتخاب‌شده در این سفارش نیست.", 422);
      const returnable = ordered - (priorById.get(orderItemId) ?? 0);
      if (quantity > returnable) throw new ReturnStatusError("تعداد انتخاب‌شده بیش از تعداد قابل مرجوع این کالاست.", 422);
    }

    const created = await tx.return.create({
      data: {
        orderId: order.id,
        userId,
        reason: input.reason,
        refundMethod: customer.refundMethod,
        refundCardNumber: customer.refundMethod === "BANK_CARD" ? customer.bankCardNumber : null,
        refundCardHolder: customer.refundMethod === "BANK_CARD" ? customer.bankCardHolder : null,
        refundCardSheba: customer.refundMethod === "BANK_CARD" ? customer.bankCardSheba : null,
        items: { create: [...merged].map(([orderItemId, quantity]) => ({ orderItemId, quantity })) },
        attachments: attachments.length
          ? { create: attachments.map((file) => ({ url: file.url, storageKey: file.storageKey, mimeType: file.mimeType, sizeBytes: file.sizeBytes, originalName: file.originalName })) }
          : undefined,
      },
      select: { id: true },
    });
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "RETURN_CREATE",
        entityType: "Return",
        entityId: created.id,
        metadata: { orderId: order.id, lineCount: merged.size, attachmentCount: attachments.length } as Prisma.InputJsonObject,
      },
    });
    return created;
  });
}

/** A customer's own return requests, newest first, with the order and requested lines. */
export function listUserReturns(userId: string) {
  return db.return.findMany({
    where: { userId },
    include: {
      order: { select: { id: true, orderNumber: true } },
      items: { include: { orderItem: { select: { name: true, sku: true, quantity: true } } } },
      attachments: { select: { id: true, url: true, mimeType: true, originalName: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/**
 * Moves a single return through its decision states. `returnId` is a reference, everything else
 * (including who resolved it) is derived server-side; the change is audit-logged.
 */
export async function updateReturnStatus(
  returnId: string,
  status: ReturnDecisionStatus,
  adminNote: string | null,
  actorId: string,
) {
  if (!z.string().cuid().safeParse(returnId).success) throw new ReturnStatusError("شناسه درخواست مرجوعی معتبر نیست.", 422);
  if (adminNote !== null && adminNote.length > returnAdminNoteMaxLength) {
    throw new ReturnStatusError(`یادداشت مدیر نباید بیش از ${returnAdminNoteMaxLength.toLocaleString("fa-IR")} نویسه باشد.`, 422);
  }

  const result = await db.$transaction(async (tx) => {
    const current = await tx.return.findUnique({
      where: { id: returnId },
      select: {
        id: true,
        status: true,
        userId: true,
        refundMethod: true,
        refundedAt: true,
        order: { select: { id: true, orderNumber: true } },
        items: { select: { quantity: true, orderItem: { select: { quantity: true, unitPrice: true } } } },
      },
    });
    if (!current) throw new ReturnStatusError("درخواست مرجوعی پیدا نشد.", 404);
    if (!allowedTransitions[status].includes(current.status)) {
      throw new ReturnStatusError("این تغییر وضعیت برای درخواست مرجوعی مجاز نیست.", 409);
    }

    const now = new Date();
    const data: Prisma.ReturnUpdateInput = { status, adminNote, resolvedAt: now, resolvedBy: actorId };
    let walletRefund = 0;

    // Completing the return releases the money. `refundedAt` is the idempotency guard so a
    // re-run cannot pay twice; the transition rules already stop COMPLETED coming round again.
    if (status === "COMPLETED" && !current.refundedAt) {
      const refundAmount = current.items.reduce((sum, line) => {
        const units = Math.min(line.quantity, line.orderItem.quantity);
        return sum + units * Number(line.orderItem.unitPrice);
      }, 0);
      data.refundAmount = refundAmount;
      data.refundedAt = now;

      if (refundAmount > 0 && current.refundMethod === "WALLET") {
        await creditWallet(tx, {
          userId: current.userId,
          amount: refundAmount,
          type: "ORDER_REFUND",
          orderId: current.order.id,
          description: `بازگشت وجه مرجوعی سفارش ${current.order.orderNumber}`,
        });
        walletRefund = refundAmount;
      }
    }

    const updated = await tx.return.update({ where: { id: returnId }, data });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "RETURN_STATUS_UPDATE",
        entityType: "Return",
        entityId: returnId,
        metadata: {
          previousStatus: current.status,
          nextStatus: status,
          hasNote: Boolean(adminNote),
          ...(updated.refundAmount ? { refundAmount: Number(updated.refundAmount), refundMethod: current.refundMethod } : {}),
        } as Prisma.InputJsonObject,
      },
    });
    return { updated, walletRefund, userId: current.userId, orderNumber: current.order.orderNumber, orderId: current.order.id };
  });

  if (result.walletRefund > 0) {
    try {
      await notifyWalletCredited(db, {
        userId: result.userId,
        amount: result.walletRefund,
        reason: `مرجوعی سفارش ${result.orderNumber}`,
        dedupeKey: `return-refund:${returnId}`,
      });
    } catch (error) {
      console.error("[notifications] Return-refund wallet notification failed.", error);
    }
  }

  return result.updated;
}

/**
 * Approves or rejects several pending returns at once. Only rows still in `PENDING` are touched;
 * each change gets its own `RETURN_STATUS_UPDATE` audit entry. Returns how many rows changed.
 */
export async function bulkUpdateReturnStatus(
  returnIds: string[],
  status: Extract<ReturnDecisionStatus, "APPROVED" | "REJECTED">,
  actorId: string,
): Promise<number> {
  const ids = [...new Set(returnIds)].filter((id) => z.string().cuid().safeParse(id).success);
  if (ids.length === 0) return 0;

  return db.$transaction(async (tx) => {
    const targets = await tx.return.findMany({ where: { id: { in: ids }, status: "PENDING" }, select: { id: true } });
    if (targets.length === 0) return 0;
    const targetIds = targets.map((row) => row.id);
    const now = new Date();
    await tx.return.updateMany({
      where: { id: { in: targetIds } },
      data: { status, resolvedAt: now, resolvedBy: actorId },
    });
    await tx.auditLog.createMany({
      data: targetIds.map((id) => ({
        actorId,
        action: "RETURN_STATUS_UPDATE",
        entityType: "Return",
        entityId: id,
        metadata: { previousStatus: "PENDING", nextStatus: status, bulk: true } as Prisma.InputJsonObject,
      })),
    });
    return targetIds.length;
  });
}
