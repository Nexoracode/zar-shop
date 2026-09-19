import assert from "node:assert/strict";
import test from "node:test";
import { normalizeIranPhone } from "@/modules/communications/faraz-messaging";
import { sendRequestIdOf, unwrapList } from "@/modules/communications/faraz-client";
import { parseFarazBalance, parseFarazLines, parseFarazProfile } from "@/modules/communications/sms-account";

test("balance is read from Faraz's documented balanceAmount / balanceCount fields", () => {
  const balance = parseFarazBalance({ status: "success", message: null, data: { balanceAmount: 5000, balanceCount: 25, details: [{ count: 25, rate: 200, amount: 5000 }] } });
  assert.deepEqual(balance, { amountToman: 5000, smsCount: 25 });
  assert.deepEqual(parseFarazBalance({ status: "success", data: {} }), { amountToman: null, smsCount: null });
});

test("profile keeps the owner, standing and plan, and rejects an empty payload", () => {
  const profile = parseFarazProfile({ status: "success", data: { displayName: "فراز اس‌ام‌اس", mobile: "09120000000", verified: true, blocked: false, plan: { id: 1, title: "پکیج", expiryDate: "2025-02-04T15:41:35.000000Z" }, permissions: "01ff" } });
  assert.deepEqual(profile, { displayName: "فراز اس‌ام‌اس", mobile: "09120000000", verified: true, blocked: false, planTitle: "پکیج", planExpiresAt: "2025-02-04T15:41:35.000000Z" });
  assert.equal(parseFarazProfile({ status: "success", data: {} }), null);
});

test("lines accept a bare list or objects, keep digits only and drop duplicates", () => {
  assert.deepEqual(parseFarazLines({ data: [{ line_number: "90008361", title: "خط خدماتی", is_dedicated: 1 }, { line_number: "90008361" }, { number: "50002178584000" }, "3000505", { line_number: "" }] }).map((line) => line.number), ["90008361", "50002178584000", "3000505"]);
  assert.deepEqual(parseFarazLines({ data: { items: [{ line_number: "90008361", is_dedicated: false }] } }), [{ number: "90008361", title: null, isDedicated: false }]);
  assert.deepEqual(parseFarazLines(null), []);
});

test("recipients are normalized to the local 09xxxxxxxxx form Faraz requires", () => {
  assert.equal(normalizeIranPhone("+989123456789"), "09123456789");
  assert.equal(normalizeIranPhone("00989123456789"), "09123456789");
  assert.equal(normalizeIranPhone("۰۹۱۲۳۴۵۶۷۸۹"), "09123456789");
  assert.equal(normalizeIranPhone("08123456789"), null);
});

test("a send response yields Faraz's request id, and lists unwrap from data or items", () => {
  assert.equal(sendRequestIdOf({ status: "success", data: 12345, message: null }), 12345);
  assert.equal(sendRequestIdOf({ status: "success", data: null }), null);
  assert.equal(unwrapList({ data: { items: [1, 2] } }).length, 2);
  assert.equal(unwrapList({ data: [1] }).length, 1);
});
