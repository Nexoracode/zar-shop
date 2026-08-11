import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { auditRequestContext } from "@/modules/audit/request-context";
import { adminReviewReportSchema } from "@/modules/reviews/schemas";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const [actor, { id }] = await Promise.all([getCurrentUser(), context.params]);
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { status } = adminReviewReportSchema.parse(await request.json());
    const report = await db.productReviewReport.findUnique({ where: { id }, select: { id: true, reviewId: true, status: true } });
    if (!report) return NextResponse.json({ message: "گزارش پیدا نشد." }, { status: 404 });
    await db.$transaction(async (tx) => {
      await tx.productReviewReport.update({ where: { id }, data: { status, resolvedAt: new Date(), resolvedById: actor.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PRODUCT_REVIEW_REPORT_UPDATE", entityType: "ProductReviewReport", entityId: id, ...auditRequestContext(request, { reviewId: report.reviewId, previousStatus: report.status, nextStatus: status }) } });
    });
    return NextResponse.json({ message: status === "RESOLVED" ? "گزارش رسیدگی شد." : "گزارش رد شد." });
  } catch (error) { return apiError(error); }
}
