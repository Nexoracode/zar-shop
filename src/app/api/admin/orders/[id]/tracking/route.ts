import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { hasPermission } from "@/modules/auth/permissions";
import { getCurrentUser } from "@/modules/auth/session";

const bodySchema = z.object({ trackingNumber: z.string().trim().max(100).nullable() });
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ message: "ابتدا وارد حساب کاربری شوید." }, { status: 401 });
    if (!hasPermission(actor.role, "orders:manage")) return NextResponse.json({ message: "برای مدیریت سفارش‌ها دسترسی کافی ندارید." }, { status: 403 });
    const { id } = await context.params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "کد رهگیری معتبر نیست." }, { status: 422 });
    const trackingNumber = parsed.data.trackingNumber || null;
    const existing = await db.order.findUnique({ where: { id }, select: { orderNumber: true, trackingNumber: true } });
    if (!existing) return NextResponse.json({ message: "سفارش پیدا نشد." }, { status: 404 });
    const order = await db.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { id }, data: { trackingNumber }, select: { id: true, trackingNumber: true, orderNumber: true } });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "ORDER_TRACKING_UPDATE",
          entityType: "Order",
          entityId: id,
          ...auditRequestContext(request, { orderNumber: updated.orderNumber, previousTrackingNumber: existing.trackingNumber, trackingNumber }),
        },
      });
      return updated;
    });
    return NextResponse.json(order);
  } catch (error) { return apiError(error); }
}
