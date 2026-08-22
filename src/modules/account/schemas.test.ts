import assert from "node:assert/strict";
import test from "node:test";
import { addressInputSchema, profileInputSchema } from "./schemas";

const address = {
  title: "خانه",
  recipientType: "SELF" as const,
  recipient: "علی رضایی",
  phone: "09121234567",
  provinceId: "cm12345678901234567890123",
  cityId: "cm12345678901234567890124",
  postalCode: "۱۲۳۴۵۶۷۸۹۰",
  addressLine: "تهران، خیابان آزادی، کوچه نمونه",
  plaque: "۱۲",
  unit: "",
  floor: "",
  isDefault: true,
};

test("normalizes Persian digits in customer identity and address fields", () => {
  const parsedAddress = addressInputSchema.parse(address);
  const parsedProfile = profileInputSchema.parse({ firstName: "علی", lastName: "رضایی", phone: "۰۹۱۲۱۲۳۴۵۶۷", email: "TEST@example.com", nationalId: "۱۲۳۴۵۶۷۸۹۰" });
  assert.equal(parsedAddress.postalCode, "1234567890");
  assert.equal(parsedProfile.phone, "09121234567");
  assert.equal(parsedProfile.nationalId, "1234567890");
  assert.equal(parsedProfile.email, "test@example.com");
});

test("accepts another recipient without a national id", () => {
  const result = addressInputSchema.safeParse({ ...address, recipientType: "OTHER" });
  assert.equal(result.success, true);
});

test("treats a missing or empty email as null, since it is optional for phone-first accounts", () => {
  const withoutEmail = profileInputSchema.parse({ firstName: "علی", lastName: "رضایی", phone: "09121234567", nationalId: "1234567890" });
  const withEmptyEmail = profileInputSchema.parse({ firstName: "علی", lastName: "رضایی", phone: "09121234567", email: "", nationalId: "1234567890" });
  assert.equal(withoutEmail.email, null);
  assert.equal(withEmptyEmail.email, null);
});
