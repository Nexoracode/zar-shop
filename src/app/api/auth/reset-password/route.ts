import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { resetPasswordSchema } from "@/modules/auth/schemas";
import { InvalidResetCodeError, consumePasswordResetCode } from "@/modules/auth/password-reset";
import { clearPasswordResetAttempts, consumePasswordResetVerifyAttempt, rateLimitResponse } from "@/modules/auth/rate-limit";
import { createSession, destroyAllUserSessions } from "@/modules/auth/session";

export async function POST(request: Request) {
  try {
    const input = resetPasswordSchema.parse(await request.json());
    const blockedUntil = await consumePasswordResetVerifyAttempt(request, input.email);
    if (blockedUntil) return rateLimitResponse(blockedUntil);
    const user = await db.user.findUnique({ where: { email: input.email }, select: { id: true, isGuest: true } });
    if (!user || user.isGuest) throw new InvalidResetCodeError();
    await consumePasswordResetCode(user.id, input.code);
    const passwordHash = await hash(input.password, 12);
    await db.user.update({ where: { id: user.id }, data: { passwordHash } });
    await destroyAllUserSessions(user.id);
    await clearPasswordResetAttempts(request, input.email);
    await createSession(user.id);
    return NextResponse.json({ message: "رمز عبور با موفقیت تغییر کرد." });
  } catch (error) {
    if (error instanceof InvalidResetCodeError) return NextResponse.json({ message: error.message }, { status: 422 });
    return apiError(error);
  }
}
