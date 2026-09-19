import assert from "node:assert/strict";
import test from "node:test";
import { IRAN_PROVINCE_SHAPES } from "@/data/iran-provinces";
import { mapIntensity, placeProvinces } from "./iran-map";

test("the map has one shape for each of the 31 provinces", () => {
  assert.equal(IRAN_PROVINCE_SHAPES.length, 31);
  assert.equal(new Set(IRAN_PROVINCE_SHAPES.map((shape) => shape.name)).size, 31);
  for (const shape of IRAN_PROVINCE_SHAPES) assert.ok(shape.d.startsWith("M") && shape.d.endsWith("Z"), shape.name);
});

test("province names match despite Arabic letters, joiners and extra spacing", () => {
  const { placed, unplaced } = placeProvinces([
    { province: "خراسان رضوي", value: 5 },
    { province: "  تهران ", value: 3 },
    { province: "تهران", value: 4 },
    { province: "چهارمحال‌ و بختیاری", value: 2 },
  ]);
  assert.equal(unplaced.length, 0);
  assert.equal(placed.get("خراسان رضوی")?.value, 5);
  assert.equal(placed.get("تهران")?.value, 7, "rows for the same province are summed");
  assert.equal(placed.get("چهارمحال و بختیاری")?.value, 2);
});

test("unknown provinces are returned instead of being dropped", () => {
  const { placed, unplaced } = placeProvinces([{ province: "نامشخص", value: 9 }, { province: "قم", value: 1 }]);
  assert.deepEqual(unplaced.map((row) => row.province), ["نامشخص"]);
  assert.equal(placed.size, 1);
});

test("fill intensity grows with the value, tops out at one and is zero without sales", () => {
  assert.equal(mapIntensity(0, 100), 0);
  assert.equal(mapIntensity(100, 100), 1);
  assert.equal(mapIntensity(500, 100), 1);
  assert.ok(mapIntensity(10, 100) > 0.1, "small provinces stay visible next to a dominant one");
  assert.ok(mapIntensity(50, 100) > mapIntensity(10, 100));
});
