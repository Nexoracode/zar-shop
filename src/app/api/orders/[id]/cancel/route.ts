import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { getCurrentUser } from "@/modules/auth/session";
import { AdminOrderStatusError, updateOrderStatusByAdmin } from "@/modules/orders/admin-status";

// A customer may only self-cancel while an order is still unpaid; once it's PAID or beyond,
// cancelling would mean reversing a real transaction, which needs a refund flow, not a
// self-service toggle.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const [user, { id }] = await Promise.all([getCurrentUser(), context.params]);
    if (!user) return NextResponse.json({ message: "ابتدا وارد حساب کاربری شوید." }, { status: 401 });
    const order = await db.order.findFirst({ where: { id, userId: user.id }, select: { id: true, status: true } });
    if (!order) return NextResponse.json({ message: "سفارش پیدا نشد." }, { status: 404 });
    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json({ message: "این سفارش پرداخت شده یا در حال پردازش است و از این بخش قابل لغو نیست." }, { status: 409 });
    }
    const result = await updateOrderStatusByAdmin({ orderId: order.id, status: "CANCELLED", actorId: user.id, audit: auditRequestContext(request, { cancelledByCustomer: true }) });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminOrderStatusError) return NextResponse.json({ message: error.message }, { status: error.statusCode });
    return apiError(error);
  }
}
