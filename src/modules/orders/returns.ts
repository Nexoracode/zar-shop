import { z } from "zod";
import type { Prisma } from "@generated/prisma/client";
import type { ReturnStatus } from "@generated/prisma/enums";
import { db } from "@/lib/db";

/** Kept in sync with the `adminNote` control's own `maxLength`, so the form cannot outgrow the check. */
export const returnAdminNoteMaxLength = 1000;

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

  return db.$transaction(async (tx) => {
    const current = await tx.return.findUnique({ where: { id: returnId }, select: { id: true, status: true } });
    if (!current) throw new ReturnStatusError("درخواست مرجوعی پیدا نشد.", 404);
    if (!allowedTransitions[status].includes(current.status)) {
      throw new ReturnStatusError("این تغییر وضعیت برای درخواست مرجوعی مجاز نیست.", 409);
    }

    const now = new Date();
    const updated = await tx.return.update({
      where: { id: returnId },
      data: { status, adminNote, resolvedAt: now, resolvedBy: actorId },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "RETURN_STATUS_UPDATE",
        entityType: "Return",
        entityId: returnId,
        metadata: { previousStatus: current.status, nextStatus: status, hasNote: Boolean(adminNote) } as Prisma.InputJsonObject,
      },
    });
    return updated;
  });
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
