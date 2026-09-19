import assert from "node:assert/strict";
import test from "node:test";
import type { PackagingBox } from "@generated/prisma/client";
import { defaultBoxChangeBlocker, selectBox, STANDARD_PACKAGING_BOX } from "@/modules/shipping/packaging";
import { packagingBoxSchema } from "@/modules/shipping/packaging-schemas";

/** Only the fields `selectBox` reads matter; the rest is filled to satisfy the type. */
function box(partial: Partial<PackagingBox> & { name: string; maxWeightGrams: number }): PackagingBox {
  return {
    id: partial.name,
    lengthCm: 0,
    widthCm: 0,
    heightCm: 0,
    weightGrams: 0,
    tapinBoxId: null,
    isDefault: false,
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as unknown as PackagingBox;
}

test("picks the tightest box that still covers the contents", () => {
  const boxes = [
    box({ name: "small", maxWeightGrams: 1000 }),
    box({ name: "medium", maxWeightGrams: 3000 }),
    box({ name: "large", maxWeightGrams: 8000 }),
  ];
  assert.equal(selectBox(2500, boxes)?.name, "medium");
  assert.equal(selectBox(1000, boxes)?.name, "small");
});

test("skips inactive boxes even when they would fit", () => {
  const boxes = [
    box({ name: "small", maxWeightGrams: 1000, isActive: false }),
    box({ name: "medium", maxWeightGrams: 3000 }),
  ];
  assert.equal(selectBox(500, boxes)?.name, "medium");
});

test("falls back to the default box when nothing fits", () => {
  const boxes = [
    box({ name: "small", maxWeightGrams: 1000 }),
    box({ name: "fallback", maxWeightGrams: 2000, isDefault: true }),
  ];
  assert.equal(selectBox(9000, boxes)?.name, "fallback");
});

test("an inactive default box is not used", () => {
  const boxes = [box({ name: "fallback", maxWeightGrams: 2000, isDefault: true, isActive: false })];
  assert.equal(selectBox(9000, boxes), null);
});

test("returns null when no box fits and there is no default", () => {
  assert.equal(selectBox(9000, [box({ name: "small", maxWeightGrams: 1000 })]), null);
  assert.equal(selectBox(100, []), null);
});

test("the default box cannot give up its flag or be switched off", () => {
  const existing = { isDefault: true };
  assert.ok(defaultBoxChangeBlocker(existing, { isDefault: false, isActive: true }));
  assert.ok(defaultBoxChangeBlocker(existing, { isDefault: true, isActive: false }));
  assert.equal(defaultBoxChangeBlocker(existing, { isDefault: true, isActive: true }), null);
});

test("an ordinary box may be changed freely", () => {
  assert.equal(defaultBoxChangeBlocker({ isDefault: false }, { isDefault: false, isActive: false }), null);
  assert.equal(defaultBoxChangeBlocker({ isDefault: false }, { isDefault: true, isActive: true }), null);
});

test("a default box must be active on the form and in the API", () => {
  const result = packagingBoxSchema.safeParse({ ...STANDARD_PACKAGING_BOX, isActive: false });
  assert.equal(result.success, false);
});

test("the standard box the store ships with passes its own schema", () => {
  assert.equal(packagingBoxSchema.safeParse(STANDARD_PACKAGING_BOX).success, true);
});
