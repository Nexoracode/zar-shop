import assert from "node:assert/strict";
import test from "node:test";
import { ApiRequestError, requestErrorMessage, requestJson } from "./api-request";

const originalFetch = globalThis.fetch;

function stubFetch(implementation: typeof globalThis.fetch) {
  globalThis.fetch = implementation;
  return () => { globalThis.fetch = originalFetch; };
}

test("returns the parsed payload on success", async () => {
  const restore = stubFetch(async () => new Response(JSON.stringify({ id: "p1", status: "ACTIVE" }), { status: 200, headers: { "Content-Type": "application/json" } }));
  try {
    assert.deepEqual(await requestJson("/api/admin/products/p1/status"), { id: "p1", status: "ACTIVE" });
  } finally { restore(); }
});

test("surfaces the server message and status on a failed response", async () => {
  const restore = stubFetch(async () => new Response(JSON.stringify({ message: "محصول پیدا نشد." }), { status: 404, headers: { "Content-Type": "application/json" } }));
  try {
    await assert.rejects(
      () => requestJson("/api/admin/products/missing/status"),
      (error: ApiRequestError) => error.message === "محصول پیدا نشد." && error.status === 404,
    );
  } finally { restore(); }
});

test("falls back to the caller's message when the response carries none", async () => {
  const restore = stubFetch(async () => new Response("<html>502</html>", { status: 502 }));
  try {
    await assert.rejects(
      () => requestJson("/api/admin/products/p1/status", {}, { fallbackMessage: "تغییر وضعیت انجام نشد." }),
      (error: ApiRequestError) => error.message === "تغییر وضعیت انجام نشد." && error.status === 502,
    );
  } finally { restore(); }
});

test("gives up on a request that never settles, so the caller is not left pending", async () => {
  // Mirrors a hung server: resolves only when the deadline aborts the signal.
  const restore = stubFetch((_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject((init.signal as AbortSignal).reason));
  }));
  try {
    await assert.rejects(
      () => requestJson("/api/admin/products/p1/status", {}, { timeoutMs: 20 }),
      (error: ApiRequestError) => error instanceof ApiRequestError && error.message.includes("پاسخی از سرور دریافت نشد"),
    );
  } finally { restore(); }
});

test("reports a network failure without leaking the underlying error", async () => {
  const restore = stubFetch(async () => { throw new TypeError("Failed to fetch"); });
  try {
    await assert.rejects(
      () => requestJson("/api/admin/products/p1/status"),
      (error: ApiRequestError) => error.message === "ارتباط با سرور برقرار نشد.",
    );
  } finally { restore(); }
});

test("requestErrorMessage falls back for non-error values", () => {
  assert.equal(requestErrorMessage(new Error("خطای مشخص")), "خطای مشخص");
  assert.equal(requestErrorMessage("something odd", "خطای ناشناخته"), "خطای ناشناخته");
});
