import assert from "node:assert/strict";
import test from "node:test";
import type { OrderStatus } from "@generated/prisma/enums";
import { adminOrderStatusTiming, orderStatusHoldsInventory } from "@/modules/orders/admin-status";
import { orderSettingsDefaults } from "@/modules/settings/order-settings";

test("all order statuses have a deterministic inventory policy", () => {
  const statuses: OrderStatus[] = ["PENDING_PAYMENT", "EXPIRED", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
  assert.deepEqual(statuses.filter(orderStatusHoldsInventory), ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED"]);
});

test("pending status receives the panel expiration duration", () => {
  const now = new Date("2026-08-17T10:00:00.000Z");
  const timing = adminOrderStatusTiming("PENDING_PAYMENT", { ...orderSettingsDefaults, orderExpirationMinutes: 25 }, now);
  assert.equal(timing.expiresAt?.toISOString(), "2026-08-17T10:25:00.000Z");
  assert.equal(timing.expiredAt, null);
  assert.equal(timing.expirationHandledAt, null);
});

test("expired and cancelled statuses close the expiration lifecycle", () => {
  const now = new Date("2026-08-17T10:00:00.000Z");
  const expired = adminOrderStatusTiming("EXPIRED", orderSettingsDefaults, now);
  const cancelled = adminOrderStatusTiming("CANCELLED", orderSettingsDefaults, now);
  assert.equal(expired.expiresAt, null);
  assert.equal(expired.expiredAt, now);
  assert.equal(expired.expirationHandledAt, now);
  assert.equal(cancelled.expiredAt, null);
  assert.equal(cancelled.expirationHandledAt, now);
});
