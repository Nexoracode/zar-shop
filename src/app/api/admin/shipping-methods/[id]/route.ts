import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { hasPermission } from "@/modules/auth/permissions";
import { getCurrentUser } from "@/modules/auth/session";
import { shippingMethodSchema } from "@/modules/shipping/schemas";

type Context = { params: Promise<{ id: string }> };

async function orderManager() {
  const actor = await getCurrentUser();
  return actor && hasPermission(actor.role, "orders:manage") ? actor : null;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await orderManager();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const input = shippingMethodSchema.parse(await request.json());
    const { zones, ...method } = input;
    const existing = await db.shippingMethod.findUnique({ where: { id }, select: { id: true, title: true } });
    if (!existing) return NextResponse.json({ message: "روش ارسال پیدا نشد." }, { status: 404 });

    await db.$transaction(async (tx) => {
      // The zone table is replaced wholesale: rows carry no meaning of their own beyond the
      // bracket they describe, so matching them up one by one would buy nothing.
      await tx.shippingZoneRate.deleteMany({ where: { methodId: id } });
      await tx.shippingMethod.update({ where: { id }, data: { ...method, zones: { create: zones } } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "SHIPPING_METHOD_UPDATE", entityType: "ShippingMethod", entityId: id, ...auditRequestContext(request, { title: method.title, carrier: method.carrier, source: method.source, zoneCount: zones.length }) } });
    });
    return NextResponse.json({ id });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await orderManager();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const method = await db.shippingMethod.findUnique({ where: { id }, select: { id: true, title: true, _count: { select: { orders: true } } } });
    if (!method) return NextResponse.json({ message: "روش ارسال پیدا نشد." }, { status: 404 });
    // Past orders keep a snapshot of the title, but the link is worth keeping too; deactivating
    // takes the method off checkout without cutting it.
    if (method._count.orders > 0) {
      return NextResponse.json({ message: `این روش در ${method._count.orders.toLocaleString("fa-IR")} سفارش استفاده شده است؛ به‌جای حذف، آن را غیرفعال کنید.` }, { status: 409 });
    }
    await db.$transaction(async (tx) => {
      await tx.shippingMethod.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "SHIPPING_METHOD_DELETE", entityType: "ShippingMethod", entityId: id, ...auditRequestContext(request, { title: method.title }) } });
    });
    return NextResponse.json({ id });
  } catch (error) {
    return apiError(error);
  }
}
