import assert from "node:assert/strict";
import test from "node:test";
import { baseShippingFee, commerceSettingsDefaults, commerceSettingsSchema, defaultDeliveryMethod, estimatedReadyAt } from "./commerce-settings";

test("requires at least one delivery method", () => {
  assert.equal(commerceSettingsSchema.safeParse({ ...commerceSettingsDefaults, insuredShippingEnabled: false, inStorePickupEnabled: false }).success, false);
});

test("calculates configured, free and pickup shipping", () => {
  const settings = { ...commerceSettingsDefaults, defaultShippingFee: 800_000, freeShippingThreshold: 10_000_000 };
  assert.equal(baseShippingFee(settings, 5_000_000, "INSURED_SHIPPING"), 800_000);
  assert.equal(baseShippingFee(settings, 10_000_000, "INSURED_SHIPPING"), 0);
  assert.equal(baseShippingFee(settings, 5_000_000, "STORE_PICKUP"), 0);
});

test("selects the enabled delivery method automatically", () => {
  assert.equal(defaultDeliveryMethod(commerceSettingsDefaults), "INSURED_SHIPPING");
  assert.equal(defaultDeliveryMethod({ ...commerceSettingsDefaults, insuredShippingEnabled: false }), "STORE_PICKUP");
});

test("calculates estimated readiness from snapshot days", () => {
  assert.equal(estimatedReadyAt(2, new Date("2026-08-02T00:00:00.000Z")).toISOString(), "2026-08-04T00:00:00.000Z");
});
