import assert from "node:assert/strict";
import test from "node:test";

import { checkoutRecipientSchema } from "./checkout-recipient";

test("normalizes checkout recipient phone", () => {
  const result = checkoutRecipientSchema.parse({
    recipientType: "OTHER",
    recipient: "علی رضایی",
    recipientPhone: "۰۹۱۲۳۴۵۶۷۸۹",
  });

  assert.equal(result.recipientPhone, "09123456789");
});

test("accepts another recipient without a national id", () => {
  assert.equal(checkoutRecipientSchema.safeParse({ recipientType: "SELF", recipient: "علی رضایی", recipientPhone: "09123456789" }).success, true);
  assert.equal(checkoutRecipientSchema.safeParse({ recipientType: "OTHER", recipient: "علی رضایی", recipientPhone: "09123456789" }).success, true);
});
