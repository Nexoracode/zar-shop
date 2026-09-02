import assert from "node:assert/strict";
import test from "node:test";

import { manualOrderSchema } from "./manual-order";

const item = { productId: "clzzzzzzzzzzzzzzzzzzzzzzzz", quantity: 1 };
const existingCustomer = { userId: "clyyyyyyyyyyyyyyyyyyyyyyyy" };

test("accepts a store-pickup order for an existing customer", () => {
  const parsed = manualOrderSchema.parse({
    customer: existingCustomer,
    items: [item],
    delivery: { method: "STORE_PICKUP" },
    payment: "PAID",
  });
  assert.equal(parsed.items[0].selectionKey, "");
  assert.equal(parsed.delivery.method, "STORE_PICKUP");
});

test("normalizes the new-customer phone and requires a name", () => {
  const parsed = manualOrderSchema.parse({
    customer: { newCustomer: { firstName: "علی", lastName: "رضایی", phone: "۰۹۱۲۳۴۵۶۷۸۹" } },
    items: [item],
    delivery: { method: "STORE_PICKUP" },
    payment: "PENDING",
  });
  assert.ok("newCustomer" in parsed.customer && parsed.customer.newCustomer.phone === "09123456789");
});

test("rejects an empty item list", () => {
  assert.equal(manualOrderSchema.safeParse({
    customer: existingCustomer,
    items: [],
    delivery: { method: "STORE_PICKUP" },
    payment: "PAID",
  }).success, false);
});

test("insured shipping needs a full address", () => {
  const base = { customer: existingCustomer, items: [item], payment: "PAID" as const };
  assert.equal(manualOrderSchema.safeParse({ ...base, delivery: { method: "INSURED_SHIPPING", shippingMethodId: null } }).success, false);
  assert.equal(manualOrderSchema.safeParse({
    ...base,
    delivery: {
      method: "INSURED_SHIPPING",
      shippingMethodId: null,
      address: { recipient: "علی رضایی", phone: "09123456789", provinceId: "clxxxxxxxxxxxxxxxxxxxxxxxx", cityId: null, province: "تهران", city: "تهران", postalCode: "1234567890", addressLine: "خیابان نمونه پلاک ۱" },
    },
  }).success, true);
});
