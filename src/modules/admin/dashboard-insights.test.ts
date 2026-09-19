import assert from "node:assert/strict";
import test from "node:test";
import { conversionRate, growthPercent } from "./dashboard-insights";

test("growth compares against the previous period and is unknown when that period had no sales", () => {
  assert.equal(growthPercent(150, 100), 50);
  assert.equal(growthPercent(50, 100), -50);
  assert.equal(growthPercent(100, 100), 0);
  assert.equal(growthPercent(120, 0), null);
  assert.equal(growthPercent(Number.NaN, 10), null);
});

test("conversion is orders per visitor, and unknown before any traffic exists", () => {
  assert.equal(conversionRate(3, 200), 1.5);
  assert.equal(conversionRate(0, 200), 0);
  assert.equal(conversionRate(5, 0), null);
});
