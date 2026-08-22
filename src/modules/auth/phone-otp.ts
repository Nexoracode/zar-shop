import { createHash, randomInt } from "node:crypto";
import { db } from "@/lib/db";
import type { PhoneOtpPurpose } from "@generated/prisma/enums";

export const PHONE_OTP_TTL_MS = 10 * 60_000;
// REGISTER only: how long a verified-but-not-yet-created account stays "verified" so the
// user has room to pick a password, separate from the 10-minute code TTL itself.
export const REGISTRATION_VERIFICATION_WINDOW_MS = 30 * 60_000;
const MAX_VERIFY_ATTEMPTS = 5;

const hashOtp = (code: string) => createHash("sha256").update(code).digest("hex");

/**
 * Issues a fresh 6-digit code for a phone+purpose pair, invalidating any unconsumed codes
 * issued earlier for that same pair so only the most recently requested one can be redeemed.
 */
export async function createPhoneOtpCode(phone: string, purpose: PhoneOtpPurpose) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.$transaction([
    db.phoneOtpCode.deleteMany({ where: { phone, purpose, consumedAt: null } }),
    db.phoneOtpCode.create({
      data: { phone, purpose, codeHash: hashOtp(code), expiresAt: new Date(Date.now() + PHONE_OTP_TTL_MS) },
    }),
  ]);
  return code;
}

export class InvalidOtpCodeError extends Error {
  constructor() {
    super("کد وارد‌شده نامعتبر یا منقضی‌شده است.");
    this.name = "InvalidOtpCodeError";
  }
}

/**
 * Verifies a submitted code against the phone's active request for that purpose. Consuming
 * and the attempts-increment happen in the same transaction so a code can't be redeemed
 * twice by racing concurrent requests, and a code is invalidated once it hits the cap.
 */
export async function consumePhoneOtpCode(phone: string, purpose: PhoneOtpPurpose, code: string) {
  const codeHash = hashOtp(code);
  const outcome = await db.$transaction(async (tx) => {
    const pending = await tx.phoneOtpCode.findFirst({
      where: { phone, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!pending || pending.attempts >= MAX_VERIFY_ATTEMPTS) return false;
    if (pending.codeHash !== codeHash) {
      await tx.phoneOtpCode.update({ where: { id: pending.id }, data: { attempts: { increment: 1 } } });
      return false;
    }
    await tx.phoneOtpCode.update({ where: { id: pending.id }, data: { consumedAt: new Date() } });
    return true;
  });
  if (!outcome) throw new InvalidOtpCodeError();
}

/** Pure so it's unit-testable without touching the database. */
export function registrationVerificationExpired(consumedAt: Date, now = new Date()) {
  return now.getTime() - consumedAt.getTime() >= REGISTRATION_VERIFICATION_WINDOW_MS;
}

/**
 * REGISTER-only: has this phone verified an OTP recently enough to finish creating an
 * account? Does not consume anything, so a failed account-creation attempt can be retried
 * without requesting a new SMS.
 */
export async function hasVerifiedRegistrationOtp(phone: string) {
  const verified = await db.phoneOtpCode.findFirst({
    where: { phone, purpose: "REGISTER", consumedAt: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  return Boolean(verified?.consumedAt && !registrationVerificationExpired(verified.consumedAt));
}

/**
 * Clears the verified REGISTER code(s) for a phone once the account has actually been
 * created, so a verified state can never be replayed for a future signup on the same phone
 * (e.g. after the account is later deleted).
 */
export async function invalidateVerifiedRegistrationOtp(phone: string) {
  await db.phoneOtpCode.deleteMany({ where: { phone, purpose: "REGISTER" } });
}
