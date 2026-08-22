import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { otpRequestSchema } from "@/modules/auth/schemas";
import { consumeOtpRequestAttempt, rateLimitResponse } from "@/modules/auth/rate-limit";
import { issuePhoneOtp, OtpPreconditionError, OtpSendFailedError } from "@/modules/auth/otp-flow";

// Resends a REGISTER code, or starts a LOGIN code ("ورود با کد یکبار مصرف"). RESET_PASSWORD
// deliberately does NOT go through this route — /api/auth/forgot-password keeps its own
// anti-enumeration generic response instead of surfacing precondition errors.
export async function POST(request: Request) {
  try {
    const { phone, purpose } = otpRequestSchema.parse(await request.json());
    const blockedUntil = await consumeOtpRequestAttempt(request, phone, purpose);
    if (blockedUntil) return rateLimitResponse(blockedUntil);
    await issuePhoneOtp(phone, purpose);
    return NextResponse.json({ message: "کد ارسال شد." });
  } catch (error) {
    if (error instanceof OtpPreconditionError) return NextResponse.json({ message: error.message }, { status: error.statusCode });
    if (error instanceof OtpSendFailedError) return NextResponse.json({ message: error.message }, { status: 503 });
    return apiError(error);
  }
}
