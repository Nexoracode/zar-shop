import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { forgotPasswordSchema } from "@/modules/auth/schemas";
import { consumePasswordResetRequestAttempt, rateLimitResponse } from "@/modules/auth/rate-limit";
import { createPasswordResetCode } from "@/modules/auth/password-reset";
import { sendPasswordResetCode } from "@/modules/communications/sms-service";

// Always answers with the same generic message regardless of whether the email exists, has
// a phone on file, or SMS is even configured — anything else would let a caller enumerate
// registered accounts by watching the response change.
const genericResponse = { message: "اگر این ایمیل در فروشگاه ثبت شده باشد، کد بازیابی به شماره همراه ثبت‌شده پیامک می‌شود." };

export async function POST(request: Request) {
  try {
    const input = forgotPasswordSchema.parse(await request.json());
    const blockedUntil = await consumePasswordResetRequestAttempt(request, input.email);
    if (blockedUntil) return rateLimitResponse(blockedUntil);
    const user = await db.user.findUnique({ where: { email: input.email }, select: { id: true, phone: true, isGuest: true } });
    if (user && !user.isGuest && user.phone) {
      const code = await createPasswordResetCode(user.id);
      await sendPasswordResetCode(user.phone, code);
    }
    return NextResponse.json(genericResponse);
  } catch (error) { return apiError(error); }
}
