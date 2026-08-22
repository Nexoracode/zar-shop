import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { phoneCheckSchema } from "@/modules/auth/schemas";
import { consumePhoneCheckAttempt, rateLimitResponse } from "@/modules/auth/rate-limit";
import { issuePhoneOtp, OtpPreconditionError, OtpSendFailedError } from "@/modules/auth/otp-flow";

// Step 1 of the phone-first auth flow: does an account already exist for this number?
// If not, a REGISTER-purpose OTP is sent immediately so the client can move straight to
// the code-entry screen without a second round trip.
export async function POST(request: Request) {
  try {
    const blockedUntil = await consumePhoneCheckAttempt(request);
    if (blockedUntil) return rateLimitResponse(blockedUntil);
    const { phone } = phoneCheckSchema.parse(await request.json());
    const existing = await db.user.findUnique({ where: { phone }, select: { status: true, isGuest: true } });
    if (existing && !existing.isGuest && existing.status === "ACTIVE") {
      return NextResponse.json({ exists: true });
    }
    await issuePhoneOtp(phone, "REGISTER");
    return NextResponse.json({ exists: false });
  } catch (error) {
    if (error instanceof OtpPreconditionError) return NextResponse.json({ message: error.message }, { status: error.statusCode });
    if (error instanceof OtpSendFailedError) return NextResponse.json({ message: error.message }, { status: 503 });
    return apiError(error);
  }
}
