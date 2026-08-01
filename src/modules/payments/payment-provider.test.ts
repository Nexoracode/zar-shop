import assert from "node:assert/strict";
import test from "node:test";
import { ZarinpalPaymentProvider } from "./payment-provider";

test("creates a sandbox Zarinpal payment request in rial", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  let requestBody: Record<string, unknown> = {};
  globalThis.fetch = (async (input, init) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ data: { code: 100, authority: "A000000000000000000000000000000001" }, errors: [] }), { status: 200 });
  }) as typeof fetch;
  try {
    const provider = new ZarinpalPaymentProvider({ merchantId: "00000000-0000-4000-8000-000000000000", sandbox: true });
    const result = await provider.request({ amount: 5_000_000, orderId: "order-1", callbackUrl: "https://shop.test/api/payment/callback" });
    assert.equal(requestUrl, "https://sandbox.zarinpal.com/pg/v4/payment/request.json");
    assert.equal(requestBody.amount, 5_000_000);
    assert.equal(requestBody.callback_url, "https://shop.test/api/payment/callback");
    assert.equal(result.redirectUrl, "https://sandbox.zarinpal.com/pg/StartPay/A000000000000000000000000000000001");
  } finally { globalThis.fetch = originalFetch; }
});

test("accepts Zarinpal already-verified code as idempotent success", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ data: { code: 101, ref_id: 123456789 }, errors: [] }), { status: 200 })) as typeof fetch;
  try {
    const provider = new ZarinpalPaymentProvider({ merchantId: "00000000-0000-4000-8000-000000000000", sandbox: false });
    assert.deepEqual(await provider.verify("authority", 5_000_000), { referenceId: "123456789" });
  } finally { globalThis.fetch = originalFetch; }
});

test("rejects unsuccessful Zarinpal responses", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ data: { code: -9 }, errors: { code: -9, message: "validation error" } }), { status: 200 })) as typeof fetch;
  try {
    const provider = new ZarinpalPaymentProvider({ merchantId: "00000000-0000-4000-8000-000000000000", sandbox: true });
    await assert.rejects(() => provider.request({ amount: 1_000, orderId: "order-1", callbackUrl: "https://shop.test/callback" }), /Zarinpal request rejected/);
  } finally { globalThis.fetch = originalFetch; }
});
