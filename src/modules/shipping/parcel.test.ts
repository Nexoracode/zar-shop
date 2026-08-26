import assert from "node:assert/strict";
import test from "node:test";
import { cartParcelWeight, chargeableWeightGrams, volumetricWeightGrams } from "@/modules/shipping/parcel";

test("cart weight multiplies each line by its quantity", () => {
  assert.equal(cartParcelWeight([{ shippingWeightGrams: 250, quantity: 3 }], 500), 750);
});

test("a product with no packaged weight falls back to the store default", () => {
  assert.equal(cartParcelWeight([{ shippingWeightGrams: null, quantity: 2 }], 500), 1000);
});

test("a zero or negative weight is treated as unmeasured, not as weightless", () => {
  assert.equal(cartParcelWeight([{ shippingWeightGrams: 0, quantity: 1 }], 400), 400);
  assert.equal(cartParcelWeight([{ shippingWeightGrams: -100, quantity: 1 }], 400), 400);
});

test("mixed lines add up", () => {
  const weight = cartParcelWeight([
    { shippingWeightGrams: 250, quantity: 2 },
    { shippingWeightGrams: null, quantity: 1 },
  ], 600);
  assert.equal(weight, 1100);
});

test("an empty cart weighs nothing", () => {
  assert.equal(cartParcelWeight([], 500), 0);
});

test("volumetric weight uses the 6000 divisor and returns grams", () => {
  // 30 × 20 × 10 / 6000 = 1kg
  assert.equal(volumetricWeightGrams(30, 20, 10), 1000);
});

test("a half-measured parcel has no volumetric weight", () => {
  assert.equal(volumetricWeightGrams(30, null, 10), 0);
  assert.equal(volumetricWeightGrams(null, null, null), 0);
});

test("carriers charge on whichever weight is greater", () => {
  assert.equal(chargeableWeightGrams(800, 1000), 1000);
  assert.equal(chargeableWeightGrams(1500, 1000), 1500);
  assert.equal(chargeableWeightGrams(800, 0), 800);
});
