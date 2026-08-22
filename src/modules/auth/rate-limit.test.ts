import assert from "node:assert/strict";
import test from "node:test";
import { loginRateLimitPolicy, nextRateLimitState, otpRequestRateLimitPolicy, otpVerifyRateLimitPolicy } from "./rate-limit";

test("blocks authentication after the configured failure threshold", () => {
  const now = new Date("2026-08-14T12:00:00.000Z");
  let state = null;
  for (let attempt = 0; attempt < loginRateLimitPolicy.maxAttempts; attempt += 1) {
    state = nextRateLimitState(state, loginRateLimitPolicy, now);
  }
  assert.equal(state!.attempts, loginRateLimitPolicy.maxAttempts);
  assert.equal(state!.blockedUntil?.getTime(), now.getTime() + loginRateLimitPolicy.blockMs);
});

test("starts a fresh authentication window after expiry", () => {
  const started = new Date("2026-08-14T12:00:00.000Z");
  const current = { attempts: 4, windowStartedAt: started, blockedUntil: null };
  const now = new Date(started.getTime() + loginRateLimitPolicy.windowMs);
  const state = nextRateLimitState(current, loginRateLimitPolicy, now);
  assert.equal(state.attempts, 1);
  assert.equal(state.windowStartedAt, now);
  assert.equal(state.blockedUntil, null);
});

test("blocks OTP requests after the configured threshold", () => {
  const now = new Date("2026-08-23T12:00:00.000Z");
  let state = null;
  for (let attempt = 0; attempt < otpRequestRateLimitPolicy.maxAttempts; attempt += 1) {
    state = nextRateLimitState(state, otpRequestRateLimitPolicy, now);
  }
  assert.equal(state!.attempts, otpRequestRateLimitPolicy.maxAttempts);
  assert.equal(state!.blockedUntil?.getTime(), now.getTime() + otpRequestRateLimitPolicy.blockMs);
});

test("OTP verification allows more attempts than requesting a fresh code, so a few typos can't burn the request budget", () => {
  assert.ok(otpVerifyRateLimitPolicy.maxAttempts > otpRequestRateLimitPolicy.maxAttempts);
});
