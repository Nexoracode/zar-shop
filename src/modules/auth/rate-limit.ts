import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { PhoneOtpPurpose } from "@generated/prisma/enums";

type RateLimitPolicy = { maxAttempts: number; windowMs: number; blockMs: number };
type RateLimitState = { attempts: number; windowStartedAt: Date; blockedUntil: Date | null };

export const loginRateLimitPolicy: RateLimitPolicy = { maxAttempts: 5, windowMs: 15 * 60_000, blockMs: 15 * 60_000 };
export const registrationRateLimitPolicy: RateLimitPolicy = { maxAttempts: 3, windowMs: 60 * 60_000, blockMs: 60 * 60_000 };
// Creating a guest session writes a User row and runs a bcrypt hash, so an unauthenticated
// caller must not be able to trigger it without bound. The allowance stays generous enough
// for shared IPs (offices, mobile carriers) doing genuine guest checkout.
export const guestSessionRateLimitPolicy: RateLimitPolicy = { maxAttempts: 20, windowMs: 60 * 60_000, blockMs: 30 * 60_000 };
// An OTP costs an SMS credit, so requesting one is throttled tightly, per account (protects
// the victim regardless of how many IPs an attacker rotates through) as well as per IP.
// Verifying a submitted code gets its own, more lenient budget — otherwise a couple of typos
// while typing the code would burn through the same allowance and block the legitimate user
// from ever requesting a fresh one. Each purpose (REGISTER/LOGIN/RESET_PASSWORD) gets its own
// scope so exhausting one flow's budget can't lock a user out of an unrelated one.
export const otpRequestRateLimitPolicy: RateLimitPolicy = { maxAttempts: 3, windowMs: 15 * 60_000, blockMs: 15 * 60_000 };
export const otpVerifyRateLimitPolicy: RateLimitPolicy = { maxAttempts: 8, windowMs: 15 * 60_000, blockMs: 15 * 60_000 };
// Checking whether a phone is already registered is the very first step of every visit to
// /login or /register, so it needs a generous, IP-only budget — just enough to stop scripted
// enumeration of which numbers have accounts.
export const phoneCheckRateLimitPolicy: RateLimitPolicy = { maxAttempts: 20, windowMs: 15 * 60_000, blockMs: 15 * 60_000 };
// The public contact form has no session to key off of, so it is throttled per IP only —
// generous enough for a genuine visitor to retry a typo, tight enough to stop spam floods.
export const contactMessageRateLimitPolicy: RateLimitPolicy = { maxAttempts: 5, windowMs: 60 * 60_000, blockMs: 60 * 60_000 };

function requestIp(request: Request) {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}

function key(scope: string, value: string) {
  return createHmac("sha256", env.AUTH_SECRET).update(`${scope}:${value.trim().toLowerCase()}`).digest("hex");
}

export function nextRateLimitState(current: RateLimitState | null, policy: RateLimitPolicy, now = new Date()): RateLimitState {
  const windowExpired = !current || now.getTime() - current.windowStartedAt.getTime() >= policy.windowMs;
  const attempts = windowExpired ? 1 : current.attempts + 1;
  return {
    attempts,
    windowStartedAt: windowExpired ? now : current.windowStartedAt,
    blockedUntil: attempts >= policy.maxAttempts ? new Date(now.getTime() + policy.blockMs) : null,
  };
}

async function isBlocked(keyHash: string, now = new Date()) {
  const state = await db.authRateLimit.findUnique({ where: { keyHash } });
  return state?.blockedUntil && state.blockedUntil > now ? state.blockedUntil : null;
}

async function recordAttempt(keyHash: string, policy: RateLimitPolicy, now = new Date()) {
  return db.$transaction(async (transaction) => {
    const current = await transaction.authRateLimit.findUnique({ where: { keyHash } });
    const next = nextRateLimitState(current, policy, now);
    await transaction.authRateLimit.upsert({
      where: { keyHash },
      create: { keyHash, ...next },
      update: next,
    });
    return next.blockedUntil;
  });
}

export async function assertLoginAllowed(request: Request, phone: string) {
  const keys = [key("login-account", phone), key("login-ip", requestIp(request))];
  const blocks = await Promise.all(keys.map((item) => isBlocked(item)));
  return blocks.find((value): value is Date => Boolean(value)) ?? null;
}

export async function recordLoginFailure(request: Request, phone: string) {
  await Promise.all([
    recordAttempt(key("login-account", phone), loginRateLimitPolicy),
    recordAttempt(key("login-ip", requestIp(request)), loginRateLimitPolicy),
  ]);
}

export async function clearLoginFailures(request: Request, phone: string) {
  await db.authRateLimit.deleteMany({ where: { keyHash: { in: [key("login-account", phone), key("login-ip", requestIp(request))] } } });
}

export async function consumeRegistrationAttempt(request: Request) {
  const keyHash = key("register-ip", requestIp(request));
  const blocked = await isBlocked(keyHash);
  if (blocked) return blocked;
  await recordAttempt(keyHash, registrationRateLimitPolicy);
  return null;
}

export async function consumeGuestSessionAttempt(request: Request) {
  const keyHash = key("guest-session-ip", requestIp(request));
  const blocked = await isBlocked(keyHash);
  if (blocked) return blocked;
  await recordAttempt(keyHash, guestSessionRateLimitPolicy);
  return null;
}

export async function consumeContactMessageAttempt(request: Request) {
  const keyHash = key("contact-message-ip", requestIp(request));
  const blocked = await isBlocked(keyHash);
  if (blocked) return blocked;
  await recordAttempt(keyHash, contactMessageRateLimitPolicy);
  return null;
}

export async function consumeOtpRequestAttempt(request: Request, phone: string, purpose: PhoneOtpPurpose) {
  const keys = [key(`otp-request-${purpose}-account`, phone), key(`otp-request-${purpose}-ip`, requestIp(request))];
  const blocks = await Promise.all(keys.map((item) => isBlocked(item)));
  const blocked = blocks.find((value): value is Date => Boolean(value));
  if (blocked) return blocked;
  await Promise.all(keys.map((item) => recordAttempt(item, otpRequestRateLimitPolicy)));
  return null;
}

export async function consumeOtpVerifyAttempt(request: Request, phone: string, purpose: PhoneOtpPurpose) {
  const keys = [key(`otp-verify-${purpose}-account`, phone), key(`otp-verify-${purpose}-ip`, requestIp(request))];
  const blocks = await Promise.all(keys.map((item) => isBlocked(item)));
  const blocked = blocks.find((value): value is Date => Boolean(value));
  if (blocked) return blocked;
  await Promise.all(keys.map((item) => recordAttempt(item, otpVerifyRateLimitPolicy)));
  return null;
}

export async function clearOtpAttempts(request: Request, phone: string, purpose: PhoneOtpPurpose) {
  await db.authRateLimit.deleteMany({
    where: {
      keyHash: {
        in: [
          key(`otp-request-${purpose}-account`, phone),
          key(`otp-request-${purpose}-ip`, requestIp(request)),
          key(`otp-verify-${purpose}-account`, phone),
          key(`otp-verify-${purpose}-ip`, requestIp(request)),
        ],
      },
    },
  });
}

export async function consumePhoneCheckAttempt(request: Request) {
  const keyHash = key("phone-check-ip", requestIp(request));
  const blocked = await isBlocked(keyHash);
  if (blocked) return blocked;
  await recordAttempt(keyHash, phoneCheckRateLimitPolicy);
  return null;
}

export function rateLimitResponse(blockedUntil: Date) {
  const retryAfter = Math.max(1, Math.ceil((blockedUntil.getTime() - Date.now()) / 1000));
  return Response.json(
    { message: "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
