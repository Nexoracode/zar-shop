import { db } from "@/lib/db";
import type { PhoneOtpPurpose } from "@generated/prisma/enums";
import { createPhoneOtpCode } from "@/modules/auth/phone-otp";
import { sendPhoneOtpCode } from "@/modules/communications/sms-service";

export class OtpPreconditionError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "OtpPreconditionError";
  }
}

export class OtpSendFailedError extends Error {
  constructor() {
    super("ارسال پیامک انجام نشد؛ کمی بعد دوباره تلاش کنید.");
    this.name = "OtpSendFailedError";
  }
}

/**
 * Validates the purpose-specific precondition, then issues and sends a code. Shared by
 * /api/auth/phone/check (auto-sends a REGISTER code for an unrecognized phone) and
 * /api/auth/otp/request (resend, plus the "login with a one-time code" trigger). NOT used
 * by forgot-password, which must keep its anti-enumeration generic response instead of
 * surfacing OtpPreconditionError to the caller.
 */
export async function issuePhoneOtp(phone: string, purpose: PhoneOtpPurpose) {
  const existing = await db.user.findUnique({ where: { phone }, select: { id: true, status: true, isGuest: true } });
  if (purpose === "REGISTER" && existing) {
    throw new OtpPreconditionError("این شماره موبایل قبلاً ثبت شده است.", 409);
  }
  if (purpose !== "REGISTER" && (!existing || existing.isGuest || existing.status !== "ACTIVE")) {
    throw new OtpPreconditionError("حساب کاربری فعالی برای این شماره پیدا نشد.", 404);
  }
  const code = await createPhoneOtpCode(phone, purpose);
  const sent = await sendPhoneOtpCode(phone, code, purpose);
  if (!sent) throw new OtpSendFailedError();
}
