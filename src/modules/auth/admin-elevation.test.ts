import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_IDLE_MS,
  ADMIN_MAX_MS,
  ADMIN_RENEW_THRESHOLD_MS,
  adminElevationActive,
  renewedAdminUntil,
  startAdminElevation,
} from "./admin-elevation";

const t0 = new Date("2026-09-19T08:00:00.000Z");
const at = (base: Date, ms: number) => new Date(base.getTime() + ms);

test("a session with no admin window is never elevated", () => {
  assert.equal(adminElevationActive({ adminSince: null, adminUntil: null }, t0), false);
  assert.equal(adminElevationActive({ adminSince: t0, adminUntil: null }, t0), false);
  assert.equal(renewedAdminUntil({ adminSince: null, adminUntil: null }, t0), null);
});

test("a fresh admin window is open for the idle period, then closes", () => {
  const window = startAdminElevation(t0);
  assert.equal(adminElevationActive(window, at(t0, ADMIN_IDLE_MS - 1)), true);
  assert.equal(adminElevationActive(window, at(t0, ADMIN_IDLE_MS)), false);
});

test("activity slides the window forward but never past the absolute cap", () => {
  const window = startAdminElevation(t0);
  const halfway = at(t0, ADMIN_IDLE_MS / 2);
  const renewed = renewedAdminUntil(window, halfway);
  assert.deepEqual(renewed, at(halfway, ADMIN_IDLE_MS));

  const nearCap = { adminSince: t0, adminUntil: at(t0, ADMIN_MAX_MS - 60_000) };
  const late = at(t0, ADMIN_MAX_MS - 90_000);
  assert.equal(renewedAdminUntil(nearCap, late), null, "cannot be pushed beyond adminSince + max");
});

test("the window closes at the absolute cap however active the session is", () => {
  const window = { adminSince: t0, adminUntil: at(t0, ADMIN_MAX_MS + ADMIN_IDLE_MS) };
  assert.equal(adminElevationActive(window, at(t0, ADMIN_MAX_MS - 1)), true);
  assert.equal(adminElevationActive(window, at(t0, ADMIN_MAX_MS)), false);
  assert.equal(renewedAdminUntil(window, at(t0, ADMIN_MAX_MS)), null);
});

test("renewals closer than the threshold are skipped, and an expired window is not revived", () => {
  const window = startAdminElevation(t0);
  assert.equal(renewedAdminUntil(window, at(t0, ADMIN_RENEW_THRESHOLD_MS - 1)), null);
  assert.notEqual(renewedAdminUntil(window, at(t0, ADMIN_RENEW_THRESHOLD_MS)), null);
  assert.equal(renewedAdminUntil(window, at(t0, ADMIN_IDLE_MS + 1)), null);
});
