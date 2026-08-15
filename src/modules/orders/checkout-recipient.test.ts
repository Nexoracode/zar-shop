import assert from "node:assert/strict";
import test from "node:test";

import { checkoutRecipientSchema } from "./checkout-recipient";

test("normalizes checkout recipient phone and national id", () => {
  const result = checkoutRecipientSchema.parse({
    recipientType: "OTHER",
    recipient: "علی رضایی",
    recipientPhone: "۰۹۱۲۳۴۵۶۷۸۹",
    recipientNationalId: "۰۰۱۲۳۴۵۶۷۸",
  });

  assert.equal(result.recipientPhone, "09123456789");
  assert.equal(result.recipientNationalId, "0012345678");
});

test("requires national id only for another recipient", () => {
  assert.equal(checkoutRecipientSchema.safeParse({ recipientType: "SELF", recipient: "علی رضایی", recipientPhone: "09123456789" }).success, true);
  assert.equal(checkoutRecipientSchema.safeParse({ recipientType: "OTHER", recipient: "علی رضایی", recipientPhone: "09123456789" }).success, false);
});
