import assert from "node:assert/strict";
import test from "node:test";
import { calculateSoldPercent } from "./sales";

test("calculates sold percent from completed sales and current stock", () => {
  assert.equal(calculateSoldPercent(97, 3), 97);
  assert.equal(calculateSoldPercent(3, 7), 30);
});

test("keeps sold percent within a safe range", () => {
  assert.equal(calculateSoldPercent(0, 0), 0);
  assert.equal(calculateSoldPercent(-5, 10), 0);
  assert.equal(calculateSoldPercent(10, -2), 100);
});
