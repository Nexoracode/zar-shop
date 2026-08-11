import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { auditRequestContext } from "@/modules/audit/request-context";
import { adminReviewReplySchema } from "@/modules/reviews/schemas";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const [actor, { id }] = await Promise.all([getCurrentUser(), context.params]);
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = adminReviewReplySchema.parse(await request.json());
    const parent = await db.productReview.findUnique({ where: { id }, select: { id: true, productId: true, parentId: true, status: true } });
    if (!parent || parent.parentId || parent.status !== "APPROVED") return NextResponse.json({ message: "دیدگاه اصلی تأییدشده پیدا نشد." }, { status: 404 });
    const reply = await db.$transaction(async (tx) => {
      const created = await tx.productReview.create({ data: { productId: parent.productId, userId: actor.id, parentId: parent.id, body: input.body, status: "APPROVED", moderatedAt: new Date(), moderatedById: actor.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PRODUCT_REVIEW_REPLY", entityType: "ProductReview", entityId: created.id, ...auditRequestContext(request, { productId: parent.productId, parentId: parent.id }) } });
      return created;
    });
    return NextResponse.json({ id: reply.id, message: "پاسخ مدیریت ثبت شد." }, { status: 201 });
  } catch (error) { return apiError(error); }
}
