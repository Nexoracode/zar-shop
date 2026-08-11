import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { auditRequestContext } from "@/modules/audit/request-context";
import { adminReviewModerationSchema } from "@/modules/reviews/schemas";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const [actor, { id }] = await Promise.all([getCurrentUser(), context.params]);
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = adminReviewModerationSchema.parse(await request.json());
    const review = await db.productReview.findUnique({ where: { id }, select: { id: true, status: true, productId: true, parentId: true } });
    if (!review) return NextResponse.json({ message: "دیدگاه پیدا نشد." }, { status: 404 });
    await db.$transaction(async (tx) => {
      await tx.productReview.update({ where: { id }, data: { status: input.status, moderationNote: input.note ?? null, moderatedAt: new Date(), moderatedById: actor.id } });
      if (input.status === "REJECTED" && !review.parentId) await tx.productReview.updateMany({ where: { parentId: id, status: "APPROVED" }, data: { status: "REJECTED", moderatedAt: new Date(), moderatedById: actor.id, moderationNote: "دیدگاه اصلی رد شده است." } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: input.status === "APPROVED" ? "PRODUCT_REVIEW_APPROVE" : "PRODUCT_REVIEW_REJECT", entityType: "ProductReview", entityId: id, ...auditRequestContext(request, { productId: review.productId, previousStatus: review.status, nextStatus: input.status, note: input.note }) } });
    });
    return NextResponse.json({ message: input.status === "APPROVED" ? "دیدگاه تأیید شد." : "دیدگاه رد شد." });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const [actor, { id }] = await Promise.all([getCurrentUser(), context.params]);
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const review = await db.productReview.findUnique({ where: { id }, select: { id: true, productId: true, title: true } });
    if (!review) return NextResponse.json({ message: "دیدگاه پیدا نشد." }, { status: 404 });
    await db.$transaction(async (tx) => {
      await tx.productReview.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PRODUCT_REVIEW_DELETE", entityType: "ProductReview", entityId: id, ...auditRequestContext(request, { productId: review.productId, title: review.title }) } });
    });
    return NextResponse.json({ message: "دیدگاه حذف شد." });
  } catch (error) { return apiError(error); }
}
