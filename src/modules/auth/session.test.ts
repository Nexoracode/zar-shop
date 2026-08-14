import assert from "node:assert/strict";
import test from "node:test";
import { hashSessionToken, sessionIsUsable } from "./session";

test("session tokens are stored as stable SHA-256 hashes", () => {
  const hash = hashSessionToken("private-session-token");
  assert.equal(hash.length, 64);
  assert.equal(hash, hashSessionToken("private-session-token"));
  assert.notEqual(hash, hashSessionToken("another-token"));
});

test("sessions require a future expiry and an active user", () => {
  const now = new Date("2026-08-14T12:00:00.000Z");
  assert.equal(sessionIsUsable({ expiresAt: new Date(now.getTime() + 1), user: { status: "ACTIVE" } }, now), true);
  assert.equal(sessionIsUsable({ expiresAt: now, user: { status: "ACTIVE" } }, now), false);
  assert.equal(sessionIsUsable({ expiresAt: new Date(now.getTime() + 1), user: { status: "SUSPENDED" } }, now), false);
});
