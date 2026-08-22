import { createHash, randomInt } from "node:crypto";
import { db } from "@/lib/db";

export const PASSWORD_RESET_CODE_TTL_MS = 10 * 60_000;
const MAX_VERIFY_ATTEMPTS = 5;

const hashResetCode = (code: string) => createHash("sha256").update(code).digest("hex");

/**
 * Issues a fresh 6-digit reset code for a user, invalidating any codes issued earlier so
 * only the most recently requested one can ever be redeemed.
 */
export async function createPasswordResetCode(userId: string) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.$transaction([
    db.passwordResetCode.deleteMany({ where: { userId, consumedAt: null } }),
    db.passwordResetCode.create({
      data: { userId, codeHash: hashResetCode(code), expiresAt: new Date(Date.now() + PASSWORD_RESET_CODE_TTL_MS) },
    }),
  ]);
  return code;
}

export class InvalidResetCodeError extends Error {
  constructor() {
    super("کد وارد‌شده نامعتبر یا منقضی‌شده است.");
    this.name = "InvalidResetCodeError";
  }
}

/**
 * Verifies a submitted code against the user's active reset request. Consuming happens in
 * the same transaction as the attempts-increment so a code can't be redeemed twice by
 * racing concurrent requests, and a code is invalidated once it hits the attempt cap.
 */
export async function consumePasswordResetCode(userId: string, code: string) {
  const codeHash = hashResetCode(code);
  const outcome = await db.$transaction(async (tx) => {
    const pending = await tx.passwordResetCode.findFirst({
      where: { userId, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!pending || pending.attempts >= MAX_VERIFY_ATTEMPTS) return false;
    if (pending.codeHash !== codeHash) {
      await tx.passwordResetCode.update({ where: { id: pending.id }, data: { attempts: { increment: 1 } } });
      return false;
    }
    await tx.passwordResetCode.update({ where: { id: pending.id }, data: { consumedAt: new Date() } });
    return true;
  });
  if (!outcome) throw new InvalidResetCodeError();
}
