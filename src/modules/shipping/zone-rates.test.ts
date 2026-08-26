import assert from "node:assert/strict";
import test from "node:test";
import { maxCoveredWeight, tableRate, type ZoneRate } from "@/modules/shipping/zone-rates";

const rates: ZoneRate[] = [
  { provinceId: null, maxWeightGrams: 1000, price: 90_000 },
  { provinceId: null, maxWeightGrams: 5000, price: 150_000 },
  { provinceId: "tehran", maxWeightGrams: 1000, price: 60_000 },
  { provinceId: "tehran", maxWeightGrams: 5000, price: 110_000 },
];

test("the narrowest bracket that covers the weight applies", () => {
  assert.equal(tableRate(rates, "tehran", 800), 60_000);
  assert.equal(tableRate(rates, "tehran", 1500), 110_000);
});

test("a province row wins over the catch-all", () => {
  assert.equal(tableRate(rates, "tehran", 800), 60_000);
  assert.equal(tableRate(rates, "fars", 800), 90_000);
});

test("a province row wins even when the catch-all is cheaper", () => {
  const inverted: ZoneRate[] = [
    { provinceId: null, maxWeightGrams: 1000, price: 50_000 },
    { provinceId: "kish", maxWeightGrams: 1000, price: 200_000 },
  ];
  assert.equal(tableRate(inverted, "kish", 500), 200_000);
});

test("a weight past every bracket has no price", () => {
  assert.equal(tableRate(rates, "tehran", 9000), null);
});

test("an empty table prices nothing", () => {
  assert.equal(tableRate([], "tehran", 500), null);
});

test("a weight exactly on a bracket edge is covered by it", () => {
  assert.equal(tableRate(rates, "tehran", 1000), 60_000);
});

test("the covered ceiling counts province rows and the catch-all together", () => {
  assert.equal(maxCoveredWeight(rates, "tehran"), 5000);
  assert.equal(maxCoveredWeight([{ provinceId: null, maxWeightGrams: 2000, price: 1 }], "fars"), 2000);
  assert.equal(maxCoveredWeight([{ provinceId: "tehran", maxWeightGrams: 2000, price: 1 }], "fars"), 0);
});
