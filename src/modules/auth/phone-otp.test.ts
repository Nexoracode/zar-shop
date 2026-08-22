import assert from "node:assert/strict";
import test from "node:test";
import { REGISTRATION_VERIFICATION_WINDOW_MS, registrationVerificationExpired } from "./phone-otp";

test("treats a code consumed inside the verification window as still verified", () => {
  const consumedAt = new Date("2026-08-23T12:00:00.000Z");
  const now = new Date(consumedAt.getTime() + REGISTRATION_VERIFICATION_WINDOW_MS - 1000);
  assert.equal(registrationVerificationExpired(consumedAt, now), false);
});

test("expires a verified registration code once the window elapses", () => {
  const consumedAt = new Date("2026-08-23T12:00:00.000Z");
  const now = new Date(consumedAt.getTime() + REGISTRATION_VERIFICATION_WINDOW_MS);
  assert.equal(registrationVerificationExpired(consumedAt, now), true);
});
