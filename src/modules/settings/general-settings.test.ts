import assert from "node:assert/strict";
import test from "node:test";
import { generalStoreSettingsDefaults, generalStoreSettingsSchema, isStorefrontAvailable } from "./general-settings";

test("accepts complete general store settings", () => {
  assert.equal(generalStoreSettingsSchema.parse(generalStoreSettingsDefaults).storeName, "زر گالری");
});

test("normalizes optional general values", () => {
  const result = generalStoreSettingsSchema.parse({ ...generalStoreSettingsDefaults, supportEmail: "", storeAddress: "" });
  assert.equal(result.supportEmail, null);
  assert.equal(result.storeAddress, null);
});

test("blocks customers during maintenance but allows admins", () => {
  const settings = { isStoreActive: true, maintenanceMode: true };
  assert.equal(isStorefrontAvailable(settings, "CUSTOMER"), false);
  assert.equal(isStorefrontAvailable(settings, "ADMIN"), true);
});
