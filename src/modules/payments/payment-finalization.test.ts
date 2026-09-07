import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@generated/prisma/client";
import { finalizeVerifiedPayment, PaymentAmountMismatchError } from "./payment-finalization";

function paymentDb(options?: { mismatchedAmount?: boolean; gatewayAmount?: number; siblingPayments?: Array<{ id: string; status: string; amount: number }> }) {
  let invoiceWrites = 0;
  const siblings = (options?.siblingPayments ?? []).map((row) => ({ ...row, amount: new Prisma.Decimal(row.amount) }));
  const payment = {
    id: "payment-1",
    orderId: "order-1",
    status: "PENDING",
    amount: new Prisma.Decimal(options?.mismatchedAmount ? 900_000 : options?.gatewayAmount ?? 1_000_000),
    order: {} as Record<string, unknown>,
  };
  const order = {
    id: "order-1",
    orderNumber: "ZG-1",
    userId: "user-1",
    status: "PENDING_PAYMENT",
    total: new Prisma.Decimal(1_000_000),
    subtotal: new Prisma.Decimal(1_000_000),
    productDiscount: new Prisma.Decimal(0),
    walletAmount: new Prisma.Decimal(0),
    shippingAddress: { phone: "09120000000", recipient: "خریدار" },
    inventoryReserved: true,
    items: [],
    payments: [{ id: payment.id, status: payment.status, amount: payment.amount }, ...siblings],
    user: { isGuest: false, firstName: "کاربر", lastName: "آزمایشی", nationalId: null, email: "user@example.com" },
  };
  payment.order = order;
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
    referral: { findFirst: async () => null },
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

test("a split order is paid once the gateway payment plus the wallet payment sum to the total", async () => {
  const database = paymentDb({
    gatewayAmount: 700_000,
    siblingPayments: [{ id: "wallet-payment", status: "SUCCESS", amount: 300_000 }],
  });
  const result = await finalizeVerifiedPayment(database.transaction, "payment-1", "reference-1");
  assert.equal(result.alreadyCompleted, false);
  assert.equal(database.invoiceWrites(), 1);
});

test("a split order rejects a gateway payment that does not cover the remainder", async () => {
  const database = paymentDb({
    gatewayAmount: 600_000,
    siblingPayments: [{ id: "wallet-payment", status: "SUCCESS", amount: 300_000 }],
  });
  await assert.rejects(() => finalizeVerifiedPayment(database.transaction, "payment-1", "reference-1"), PaymentAmountMismatchError);
});
