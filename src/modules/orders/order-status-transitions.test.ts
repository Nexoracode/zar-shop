import assert from "node:assert/strict";
import { test } from "node:test";
import { OrderStatus } from "@generated/prisma/enums";
import { adminOrderStatusOptions, allowedAdminOrderTransitions, canAdminMoveOrder } from "@/modules/orders/order-status-transitions";

test("every order status has a transition list", () => {
  for (const status of Object.values(OrderStatus)) {
    assert.ok(Array.isArray(allowedAdminOrderTransitions[status]), `${status} has no transition list`);
  }
});

test("a no-op transition is always allowed", () => {
  for (const status of Object.values(OrderStatus)) {
    assert.equal(canAdminMoveOrder(status, status), true);
  }
});

test("REFUNDED is terminal", () => {
  assert.deepEqual(allowedAdminOrderTransitions.REFUNDED, []);
  assert.equal(canAdminMoveOrder("REFUNDED", "PAID"), false);
  assert.equal(canAdminMoveOrder("REFUNDED", "PROCESSING"), false);
});

test("an unpaid order cannot jump straight to a fulfilment state", () => {
  assert.equal(canAdminMoveOrder("PENDING_PAYMENT", "SHIPPED"), false);
  assert.equal(canAdminMoveOrder("PENDING_PAYMENT", "DELIVERED"), false);
  assert.equal(canAdminMoveOrder("EXPIRED", "PROCESSING"), false);
  assert.equal(canAdminMoveOrder("CANCELLED", "SHIPPED"), false);
});

test("normal forward and one-step-back moves are allowed", () => {
  assert.equal(canAdminMoveOrder("PENDING_PAYMENT", "PAID"), true);
  assert.equal(canAdminMoveOrder("PAID", "PROCESSING"), true);
  assert.equal(canAdminMoveOrder("PROCESSING", "SHIPPED"), true);
  assert.equal(canAdminMoveOrder("SHIPPED", "DELIVERED"), true);
  assert.equal(canAdminMoveOrder("SHIPPED", "PROCESSING"), true);
  assert.equal(canAdminMoveOrder("DELIVERED", "REFUNDED"), true);
});

test("the select options include the current status first", () => {
  assert.equal(adminOrderStatusOptions("PAID")[0], "PAID");
  assert.deepEqual(adminOrderStatusOptions("REFUNDED"), ["REFUNDED"]);
});
