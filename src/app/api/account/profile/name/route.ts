import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { profileNameInputSchema } from "@/modules/account/schemas";

/**
 * Fills in just firstName/lastName — used by the address form's "تحویل به خودم" path to save a
 * still-empty account name in passing, without the full profile form's phone/email/nationalId
 * fields (and their duplicate-account checks) in the way.
 */
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });
    if (user.isGuest) return NextResponse.json({ message: "برای تکمیل پروفایل ابتدا حساب دائمی ایجاد کنید." }, { status: 403 });
    const input = profileNameInputSchema.parse(await request.json());
    const updated = await db.user.update({ where: { id: user.id }, data: input, select: { firstName: true, lastName: true } });
    return NextResponse.json({ user: updated });
  } catch (error) { return apiError(error); }
}
