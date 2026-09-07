import { Prisma } from "@generated/prisma/client";
import type { PrismaClient } from "@generated/prisma/client";

type DbLike = PrismaClient | Prisma.TransactionClient;

// No 0/O/1/I/L so a code read aloud or typed by hand is unambiguous.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function generateReferralCode() {
  let code = "";
  const bytes = new Uint32Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  for (let index = 0; index < CODE_LENGTH; index += 1) code += ALPHABET[bytes[index] % ALPHABET.length];
  return code;
}

/** Latin/technical value — always compared and stored uppercase, with Persian/Arabic digits folded. */
export function normalizeReferralCode(value: string) {
  return value
    .trim()
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .toUpperCase();
}

/**
 * Returns the user's own referral code, minting one on first need. Existing accounts predate the
 * column, so the code is filled in lazily the first time the referral page (or registration) asks
 * for it. Retries on the rare unique collision.
 */
export async function ensureReferralCode(db: DbLike, userId: string): Promise<string> {
  const existing = await db.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (existing?.referralCode) return existing.referralCode;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateReferralCode();
    try {
      await db.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  throw new Error("ساخت کد معرف ناموفق بود؛ دوباره تلاش کنید.");
}
