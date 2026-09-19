import assert from "node:assert/strict";
import test from "node:test";
import { compactNumber, niceCeil } from "./chart-scale";

test("niceCeil rounds up to a readable ceiling and never returns zero", () => {
  assert.equal(niceCeil(0), 1);
  assert.equal(niceCeil(-4), 1);
  assert.equal(niceCeil(Number.NaN), 1);
  assert.equal(niceCeil(1), 1);
  assert.equal(niceCeil(7), 10);
  assert.equal(niceCeil(316), 500);
  assert.equal(niceCeil(209), 250);
  assert.equal(niceCeil(104), 200);
  assert.equal(niceCeil(2500), 2500);
  assert.equal(niceCeil(2501), 5000);
});

test("compactNumber shortens thousands and millions", () => {
  assert.equal(compactNumber(42), (42).toLocaleString("fa-IR"));
  assert.equal(compactNumber(1200), `${(1.2).toLocaleString("fa-IR")}K`);
  assert.equal(compactNumber(3_400_000), `${(3.4).toLocaleString("fa-IR")}M`);
});
