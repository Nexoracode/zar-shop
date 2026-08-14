import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { profileInputSchema } from "@/modules/account/schemas";

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });
    if (user.isGuest) return NextResponse.json({ message: "برای تکمیل پروفایل ابتدا حساب دائمی ایجاد کنید." }, { status: 403 });
    const input = profileInputSchema.parse(await request.json());
    const duplicate = await db.user.findFirst({
      where: {
        id: { not: user.id },
        OR: [{ email: input.email }, { phone: input.phone }, ...(input.nationalId ? [{ nationalId: input.nationalId }] : [])],
      },
      select: { id: true },
    });
    if (duplicate) return NextResponse.json({ message: "ایمیل، موبایل یا کد ملی قبلاً استفاده شده است." }, { status: 409 });
    const updated = await db.user.update({ where: { id: user.id }, data: input, select: { firstName: true, lastName: true, email: true, phone: true, nationalId: true } });
    return NextResponse.json({ user: updated });
  } catch (error) { return apiError(error); }
}
