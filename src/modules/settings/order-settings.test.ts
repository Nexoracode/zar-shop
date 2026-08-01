import assert from "node:assert/strict";
import test from "node:test";
import { orderExpiresAt, orderSettingsDefaults, orderSettingsSchema } from "./order-settings";

test("accepts and normalizes order settings", () => {
  const result = orderSettingsSchema.parse({ ...orderSettingsDefaults, orderNumberPrefix: " zg ", minimumOrderAmount: "6000000" });
  assert.equal(result.orderNumberPrefix, "ZG");
  assert.equal(result.minimumOrderAmount, 6_000_000);
});

test("warning must be earlier than expiration", () => {
  assert.equal(orderSettingsSchema.safeParse({ ...orderSettingsDefaults, orderWarningMinutes: 15 }).success, false);
});

test("calculates expiration from configured start", () => {
  const startedAt = new Date("2026-08-01T12:00:00.000Z");
  assert.equal(orderExpiresAt(orderSettingsDefaults, startedAt)?.toISOString(), "2026-08-01T12:15:00.000Z");
  assert.equal(orderExpiresAt({ ...orderSettingsDefaults, orderExpirationEnabled: false }, startedAt), null);
});
