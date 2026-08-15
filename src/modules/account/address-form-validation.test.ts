import assert from "node:assert/strict";
import test from "node:test";

import { validateAddressForm } from "./address-form-validation";

test("returns a field error for every missing required address value", () => {
  const errors = validateAddressForm({ provinceId: "", cityId: "", addressLine: "", plaque: "", postalCode: "", title: "" });

  assert.deepEqual(Object.keys(errors).sort(), ["addressLine", "cityId", "plaque", "postalCode", "provinceId", "title"]);
});

test("accepts Persian postal-code digits and ignores optional fields", () => {
  const errors = validateAddressForm({
    provinceId: "province-id",
    cityId: "city-id",
    addressLine: "خیابان آزادی، کوچه یکم",
    plaque: "۱۲",
    postalCode: "۱۲۳۴۵۶۷۸۹۰",
    title: "خانه",
  });

  assert.deepEqual(errors, {});
});
