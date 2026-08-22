import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser, createSession, destroyAllUserSessions } from "@/modules/auth/session";
import { changePasswordSchema } from "@/modules/auth/schemas";

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });
    if (user.isGuest) return NextResponse.json({ message: "حساب مهمان رمز عبور ندارد." }, { status: 403 });
    const input = changePasswordSchema.parse(await request.json());
    if (!(await compare(input.currentPassword, user.passwordHash))) {
      return NextResponse.json({ message: "رمز عبور فعلی نادرست است." }, { status: 401 });
    }
    const passwordHash = await hash(input.newPassword, 12);
    await db.user.update({ where: { id: user.id }, data: { passwordHash } });
    // Revoke every other session, then re-issue one for the device that just made the
    // change so the current user isn't logged out of their own request.
    await destroyAllUserSessions(user.id);
    await createSession(user.id);
    return NextResponse.json({ message: "رمز عبور با موفقیت تغییر کرد." });
  } catch (error) { return apiError(error); }
}
