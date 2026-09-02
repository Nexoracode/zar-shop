import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { createManualOrder, ManualOrderError, manualOrderSchema } from "@/modules/orders/manual-order";

export async function POST(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "orders:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = manualOrderSchema.parse(await request.json());
    const order = await createManualOrder(actor.id, input);
    return NextResponse.json({ id: order.id, orderNumber: order.orderNumber }, { status: 201 });
  } catch (error) {
    if (error instanceof ManualOrderError) return NextResponse.json({ message: error.message }, { status: 409 });
    return apiError(error);
  }
}
