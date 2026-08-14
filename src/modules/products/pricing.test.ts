import assert from "node:assert/strict";
import test from "node:test";
import { calculateProductPrice } from "./pricing";

test("calculates fractional gold weight with exact decimal arithmetic", () => {
  const result = calculateProductPrice({
    goldPricePerGram18: "48500000",
    weightGrams: "1.125",
    purity: 750,
    makingFeeType: "PERCENT",
    makingFeeValue: "12.5",
    profitPercent: "7",
    taxPercent: "10",
  });
  assert.deepEqual(result, {
    rawGold: 54_562_500,
    makingFee: 6_820_313,
    profit: 4_296_797,
    tax: 1_111_711,
    total: 66_791_320,
  });
});

test("rounds only persisted rial components and final total", () => {
  const result = calculateProductPrice({
    goldPricePerGram18: "1000001",
    weightGrams: "0.333",
    purity: 750,
    makingFeeType: "FIXED",
    makingFeeValue: "0",
    profitPercent: "0",
    taxPercent: "0",
  });
  assert.equal(result.rawGold, 333_000);
  assert.equal(result.total, 333_000);
});
