import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { forgotPasswordSchema } from "@/modules/auth/schemas";
import { consumeOtpRequestAttempt, rateLimitResponse } from "@/modules/auth/rate-limit";
import { createPhoneOtpCode } from "@/modules/auth/phone-otp";
import { sendPhoneOtpCode } from "@/modules/communications/sms-service";

// Always answers with the same generic message regardless of whether the phone belongs to
// an account or SMS is even configured — anything else would let a caller enumerate
// registered accounts by watching the response change.
const genericResponse = { message: "اگر این شماره در فروشگاه ثبت شده باشد، کد بازیابی پیامک می‌شود." };

export async function POST(request: Request) {
  try {
    const input = forgotPasswordSchema.parse(await request.json());
    const blockedUntil = await consumeOtpRequestAttempt(request, input.phone, "RESET_PASSWORD");
    if (blockedUntil) return rateLimitResponse(blockedUntil);
    const user = await db.user.findUnique({ where: { phone: input.phone }, select: { isGuest: true, status: true } });
    if (user && !user.isGuest && user.status === "ACTIVE") {
      const code = await createPhoneOtpCode(input.phone, "RESET_PASSWORD");
      await sendPhoneOtpCode(input.phone, code, "RESET_PASSWORD");
    }
    return NextResponse.json(genericResponse);
  } catch (error) { return apiError(error); }
}
