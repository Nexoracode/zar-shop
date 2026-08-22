import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { loginSchema } from "@/modules/auth/schemas";
import { assertLoginAllowed, clearLoginFailures, rateLimitResponse, recordLoginFailure } from "@/modules/auth/rate-limit";
import { completeLogin } from "@/modules/auth/complete-login";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const blockedUntil = await assertLoginAllowed(request, input.phone);
    if (blockedUntil) return rateLimitResponse(blockedUntil);
    const user = await db.user.findUnique({ where: { phone: input.phone } });
    if (!user || user.isGuest || user.status !== "ACTIVE" || !(await compare(input.password, user.passwordHash))) {
      await recordLoginFailure(request, input.phone);
      return NextResponse.json({ message: "شماره موبایل یا رمز عبور نادرست است." }, { status: 401 });
    }
    await completeLogin(request, user);
    await clearLoginFailures(request, input.phone);
    return NextResponse.json({ user: { id: user.id, role: user.role } });
  } catch (error) { return apiError(error); }
}
