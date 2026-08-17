import { NextResponse } from "next/server";
import { z } from "zod";
import { OrderStatus } from "@generated/prisma/enums";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { hasPermission } from "@/modules/auth/permissions";
import { getCurrentUser } from "@/modules/auth/session";
import { AdminOrderStatusError, updateOrderStatusByAdmin } from "@/modules/orders/admin-status";

const bodySchema = z.object({ status: z.enum(OrderStatus) });
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const [actor, { id }] = await Promise.all([getCurrentUser(), context.params]);
    if (!actor) return NextResponse.json({ message: "ابتدا وارد حساب کاربری شوید." }, { status: 401 });
    if (!hasPermission(actor.role, "orders:manage")) return NextResponse.json({ message: "برای مدیریت سفارش‌ها دسترسی کافی ندارید." }, { status: 403 });
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "وضعیت سفارش معتبر نیست." }, { status: 422 });
    const result = await updateOrderStatusByAdmin({ orderId: id, status: parsed.data.status, actorId: actor.id, audit: auditRequestContext(request) });
    return NextResponse.json({ ...result, expiresAt: result.expiresAt?.toISOString() ?? null, message: "وضعیت سفارش به‌روزرسانی شد. وضعیت تراکنش بانکی مستقل باقی ماند." });
  } catch (error) {
    if (error instanceof AdminOrderStatusError) return NextResponse.json({ message: error.message }, { status: error.statusCode });
    return apiError(error);
  }
}
