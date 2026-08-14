import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@generated/prisma/client";
import { finalizeVerifiedPayment, PaymentAmountMismatchError } from "./payment-finalization";

function paymentDb(options?: { mismatchedAmount?: boolean }) {
  let invoiceWrites = 0;
  const order = {
    id: "order-1",
    orderNumber: "ZG-1",
    userId: "user-1",
    status: "PENDING_PAYMENT",
    total: new Prisma.Decimal(1_000_000),
    subtotal: new Prisma.Decimal(1_000_000),
    productDiscount: new Prisma.Decimal(0),
    shippingAddress: { phone: "09120000000", recipient: "خریدار" },
    inventoryReserved: true,
    items: [],
    user: { isGuest: false, firstName: "کاربر", lastName: "آزمایشی", nationalId: null, email: "user@example.com" },
  };
  const payment = {
    id: "payment-1",
    orderId: order.id,
    status: "PENDING",
    amount: new Prisma.Decimal(options?.mismatchedAmount ? 900_000 : 1_000_000),
    order,
  };
  const transaction = {
    payment: {
      findUnique: async () => payment,
      updateMany: async () => {
        if (payment.status === "SUCCESS") return { count: 0 };
        payment.status = "SUCCESS";
        return { count: 1 };
      },
    },
    order: {
      updateMany: async () => {
        if (order.status !== "PENDING_PAYMENT") return { count: 0 };
        order.status = "PAID";
        return { count: 1 };
      },
    },
    promotionReward: { updateMany: async () => ({ count: 0 }) },
    storeSetting: { findUnique: async () => null },
    invoice: { upsert: async () => { invoiceWrites += 1; } },
    promotion: { findMany: async () => [] },
    cartItem: { deleteMany: async () => ({ count: 0 }) },
    auditLog: { create: async () => undefined },
  } as unknown as Prisma.TransactionClient;
  return { transaction, invoiceWrites: () => invoiceWrites };
}

test("verified payment finalization is idempotent", async () => {
  const database = paymentDb();
  const first = await finalizeVerifiedPayment(database.transaction, "payment-1", "reference-1");
  const second = await finalizeVerifiedPayment(database.transaction, "payment-1", "reference-1");
  assert.equal(first.alreadyCompleted, false);
  assert.equal(second.alreadyCompleted, true);
  assert.equal(database.invoiceWrites(), 1);
});

test("verified payment amount must equal the order snapshot", async () => {
  const database = paymentDb({ mismatchedAmount: true });
  await assert.rejects(() => finalizeVerifiedPayment(database.transaction, "payment-1", "reference-1"), PaymentAmountMismatchError);
  assert.equal(database.invoiceWrites(), 0);
});
