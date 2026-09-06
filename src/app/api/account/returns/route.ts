import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { createReturnRequest, returnRequestSchema, ReturnStatusError } from "@/modules/orders/returns";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.isGuest) return NextResponse.json({ message: "برای ثبت درخواست مرجوعی وارد حساب شوید." }, { status: 401 });

    const parsed = returnRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "اطلاعات درخواست مرجوعی معتبر نیست." }, { status: 422 });

    const created = await createReturnRequest(parsed.data, user.id);
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof ReturnStatusError) return NextResponse.json({ message: error.message }, { status: error.statusCode });
    return apiError(error);
  }
}
