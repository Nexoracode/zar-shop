import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { hasPermission } from "@/modules/auth/permissions";
import { getCurrentUser } from "@/modules/auth/session";
import { promotionData, serializePromotion } from "@/modules/promotions/admin";
import { updatePromotionSchema } from "@/modules/promotions/schemas";

type Context = { params: Promise<{ id: string }> };

async function actorWithAccess() {
  const actor = await getCurrentUser();
  return actor && hasPermission(actor.role, "orders:manage") ? actor : null;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await actorWithAccess();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const input = updatePromotionSchema.parse(await request.json());
    const promotion = await db.$transaction(async (tx) => {
      const updated = await tx.promotion.update({ where: { id }, data: promotionData(input), include: { _count: { select: { redemptions: true, rewards: true } } } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PROMOTION_UPDATE", entityType: "Promotion", entityId: id, metadata: { type: updated.type, isActive: updated.isActive } } });
      return updated;
    });
    return NextResponse.json(serializePromotion(promotion));
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ message: "این کد تخفیف قبلاً ثبت شده است." }, { status: 409 });
    if (typeof error === "object" && error && "code" in error && error.code === "P2025") return NextResponse.json({ message: "پروموشن پیدا نشد." }, { status: 404 });
    return apiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const actor = await actorWithAccess();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const promotion = await db.promotion.findUnique({ where: { id }, include: { _count: { select: { redemptions: true, rewards: true } } } });
    if (!promotion) return NextResponse.json({ message: "پروموشن پیدا نشد." }, { status: 404 });
    if (promotion._count.redemptions || promotion._count.rewards) return NextResponse.json({ message: "این پروموشن سابقه استفاده دارد و فقط می‌تواند غیرفعال شود." }, { status: 409 });
    await db.$transaction(async (tx) => {
      await tx.promotion.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PROMOTION_DELETE", entityType: "Promotion", entityId: id, metadata: { type: promotion.type, code: promotion.code } } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
