import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { resetPasswordSchema } from "@/modules/auth/schemas";
import { InvalidOtpCodeError, consumePhoneOtpCode } from "@/modules/auth/phone-otp";
import { clearOtpAttempts, consumeOtpVerifyAttempt, rateLimitResponse } from "@/modules/auth/rate-limit";
import { createSession, destroyAllUserSessions } from "@/modules/auth/session";

export async function POST(request: Request) {
  try {
    const input = resetPasswordSchema.parse(await request.json());
    const blockedUntil = await consumeOtpVerifyAttempt(request, input.phone, "RESET_PASSWORD");
    if (blockedUntil) return rateLimitResponse(blockedUntil);
    const user = await db.user.findUnique({ where: { phone: input.phone }, select: { id: true, isGuest: true } });
    if (!user || user.isGuest) throw new InvalidOtpCodeError();
    await consumePhoneOtpCode(input.phone, "RESET_PASSWORD", input.code);
    const passwordHash = await hash(input.password, 12);
    await db.user.update({ where: { id: user.id }, data: { passwordHash } });
    await destroyAllUserSessions(user.id);
    await clearOtpAttempts(request, input.phone, "RESET_PASSWORD");
    await createSession(user.id);
    return NextResponse.json({ message: "رمز عبور با موفقیت تغییر کرد." });
  } catch (error) {
    if (error instanceof InvalidOtpCodeError) return NextResponse.json({ message: error.message }, { status: 422 });
    return apiError(error);
  }
}
