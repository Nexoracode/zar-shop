import assert from "node:assert/strict";
import test from "node:test";
import { loginSchema, phoneSchema, registerCompleteSchema } from "./schemas";

test("normalizes Persian digits and validates the 09xxxxxxxxx phone shape", () => {
  assert.equal(phoneSchema.parse("۰۹۱۲۱۲۳۴۵۶۷"), "09121234567");
  assert.equal(phoneSchema.safeParse("09121234").success, false);
  assert.equal(phoneSchema.safeParse("+989121234567").success, false);
});

test("allows registration without a name, since it can be completed later from the profile", () => {
  const result = registerCompleteSchema.safeParse({ phone: "09121234567", password: "abcd1234" });
  assert.equal(result.success, true);
});

test("rejects a login payload that carries an email instead of a phone", () => {
  const result = loginSchema.safeParse({ email: "user@example.com", password: "abcd1234" });
  assert.equal(result.success, false);
});
