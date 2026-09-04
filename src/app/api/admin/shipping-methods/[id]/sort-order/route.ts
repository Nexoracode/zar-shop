import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { hasPermission } from "@/modules/auth/permissions";
import { getCurrentUser } from "@/modules/auth/session";
import { shippingMethodSortOrderSchema } from "@/modules/shipping/schemas";

type Context = { params: Promise<{ id: string }> };

async function orderManager() {
  const actor = await getCurrentUser();
  return actor && hasPermission(actor.role, "orders:manage") ? actor : null;
}

/** Drag-reorder in the admin list — touches only `sortOrder`, never the rest of the method. */
export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await orderManager();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const { sortOrder } = shippingMethodSortOrderSchema.parse(await request.json());
    const existing = await db.shippingMethod.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ message: "روش ارسال پیدا نشد." }, { status: 404 });

    await db.$transaction(async (tx) => {
      await tx.shippingMethod.update({ where: { id }, data: { sortOrder } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "SHIPPING_METHOD_UPDATE", entityType: "ShippingMethod", entityId: id, ...auditRequestContext(request, { sortOrder }) } });
    });
    return NextResponse.json({ id, sortOrder });
  } catch (error) {
    return apiError(error);
  }
}
