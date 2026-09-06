import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getPermittedActor } from "@/modules/auth/session";
import { ReturnStatusError, returnStatusUpdateSchema, updateReturnStatus } from "@/modules/orders/returns";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getPermittedActor("orders:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const parsed = returnStatusUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "اطلاعات ارسال‌شده معتبر نیست." }, { status: 422 });

    const updated = await updateReturnStatus(id, parsed.data.status, parsed.data.adminNote ?? null, actor.id);
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (error) {
    if (error instanceof ReturnStatusError) return NextResponse.json({ message: error.message }, { status: error.statusCode });
    return apiError(error);
  }
}
