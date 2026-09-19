import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { loginSchema } from "@/modules/auth/schemas";
import { assertLoginAllowed, clearLoginFailures, rateLimitResponse, recordLoginFailure } from "@/modules/auth/rate-limit";
import { completeLogin } from "@/modules/auth/complete-login";
import { isAdminRole } from "@/modules/auth/permissions";

// The only sign-in that opens the admin window on a session. The customer-facing /api/auth/login
// and the OTP flow deliberately never do, so the admin panel always needs the staff password —
// being signed in on the storefront, even as an ADMIN, is not enough to reach it.
export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const blockedUntil = await assertLoginAllowed(request, input.phone);
    if (blockedUntil) return rateLimitResponse(blockedUntil);
    const user = await db.user.findUnique({ where: { phone: input.phone } });
    if (!user || user.isGuest || user.status !== "ACTIVE" || !user.passwordHash || !(await compare(input.password, user.passwordHash))) {
      await recordLoginFailure(request, input.phone);
      return NextResponse.json({ message: "شماره موبایل یا رمز عبور نادرست است." }, { status: 401 });
    }
    if (!isAdminRole(user.role)) {
      return NextResponse.json({ message: "این حساب دسترسی به پنل مدیریت را ندارد." }, { status: 403 });
    }
    await completeLogin(request, user, { elevated: true });
    await clearLoginFailures(request, input.phone);
    return NextResponse.json({ user: { id: user.id, role: user.role } });
  } catch (error) { return apiError(error); }
}
