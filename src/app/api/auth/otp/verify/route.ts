import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { otpVerifySchema } from "@/modules/auth/schemas";
import { consumeOtpVerifyAttempt, clearOtpAttempts, rateLimitResponse } from "@/modules/auth/rate-limit";
import { InvalidOtpCodeError, consumePhoneOtpCode } from "@/modules/auth/phone-otp";
import { completeLogin } from "@/modules/auth/complete-login";

export async function POST(request: Request) {
  try {
    const { phone, purpose, code } = otpVerifySchema.parse(await request.json());
    const blockedUntil = await consumeOtpVerifyAttempt(request, phone, purpose);
    if (blockedUntil) return rateLimitResponse(blockedUntil);
    await consumePhoneOtpCode(phone, purpose, code);
    await clearOtpAttempts(request, phone, purpose);

    if (purpose === "REGISTER") {
      // No session yet — the account doesn't exist. The client moves on to the
      // set-password step; /api/auth/register/complete checks hasVerifiedRegistrationOtp.
      return NextResponse.json({ verified: true });
    }

    // purpose === "LOGIN": the phone must belong to an active, non-guest account (already
    // required to issue the code in the first place, re-checked here defensively).
    const user = await db.user.findUnique({ where: { phone }, select: { id: true, role: true, status: true, isGuest: true } });
    if (!user || user.isGuest || user.status !== "ACTIVE") {
      return NextResponse.json({ message: "حساب کاربری فعالی برای این شماره پیدا نشد." }, { status: 404 });
    }
    await completeLogin(request, user);
    return NextResponse.json({ verified: true, user: { id: user.id, role: user.role } });
  } catch (error) {
    if (error instanceof InvalidOtpCodeError) return NextResponse.json({ message: error.message }, { status: 422 });
    return apiError(error);
  }
}
