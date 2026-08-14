import assert from "node:assert/strict";
import test from "node:test";
import { loginRateLimitPolicy, nextRateLimitState } from "./rate-limit";

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
