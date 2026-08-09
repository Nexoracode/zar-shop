import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { hasPermission } from "@/modules/auth/permissions";
import { getCurrentUser } from "@/modules/auth/session";
import { promotionData, serializePromotion } from "@/modules/promotions/admin";
import { promotionSchema } from "@/modules/promotions/schemas";
import { auditRequestContext } from "@/modules/audit/request-context";

async function actorWithAccess() {
  const actor = await getCurrentUser();
  return actor && hasPermission(actor.role, "orders:manage") ? actor : null;
}

export async function GET() {
  const actor = await actorWithAccess();
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  const promotions = await db.promotion.findMany({
    include: { _count: { select: { redemptions: true, rewards: true } } },
    orderBy: [{ createdAt: "desc" }],
  });
  return NextResponse.json({ items: promotions.map(serializePromotion) });
}

export async function POST(request: Request) {
  try {
    const actor = await actorWithAccess();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = promotionSchema.parse(await request.json());
    const promotion = await db.$transaction(async (tx) => {
      const created = await tx.promotion.create({ data: promotionData(input), include: { _count: { select: { redemptions: true, rewards: true } } } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PROMOTION_CREATE", entityType: "Promotion", entityId: created.id, ...auditRequestContext(request, { title: created.title, type: created.type, code: created.code }) } });
      return created;
    });
    return NextResponse.json(serializePromotion(promotion), { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ message: "این کد تخفیف قبلاً ثبت شده است." }, { status: 409 });
    return apiError(error);
  }
}

