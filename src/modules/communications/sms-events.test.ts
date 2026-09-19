import assert from "node:assert/strict";
import test from "node:test";
import { communicationSettingsPatchSchema, communicationSettingsSchema } from "@/modules/communications/communication-settings";
import { buildPatternAttributes, guessEventVariable, renderSmsTemplate, smsEventFlagKey, smsEventIds, smsEventInfo, smsEventRulesSchema, smsEvents } from "@/modules/communications/sms-events";

test("every event has an on/off column, a default template and at least the store name to fill in", () => {
  const settings = communicationSettingsSchema.parse({ smsEnabled: true, inAppEnabled: true, adminPhone: null, orderCreatedSms: true, paymentSuccessSms: true, orderShippedSms: true, orderExpiredSms: false, lowStockAdminSms: false, templates: {} });
  for (const id of smsEventIds) {
    assert.equal(typeof settings[smsEventFlagKey(id)], "boolean", `${id} flag`);
    assert.ok(settings.templates[id].length > 0, `${id} template`);
  }
  assert.equal(smsEvents.length, smsEventIds.length);
  assert.ok(smsEventInfo("orderShipped").variables.includes("trackingNumber"));
  assert.ok(!smsEventInfo("orderCreated").variables.includes("trackingNumber"));
});

test("text templates fill known tokens and leave unknown ones as written", () => {
  assert.equal(renderSmsTemplate("سفارش {orderNumber} از {storeName} {missing}", { orderNumber: "ZG-1", storeName: "زر" }), "سفارش ZG-1 از زر {missing}");
});

test("pattern attributes take the bound values, blank ones become a dash and free text is cut to the variable length", () => {
  const attributes = buildPatternAttributes(
    { name: { source: "customerName", maxLength: 5 }, order: { source: "orderNumber", maxLength: 2 }, track: { source: "trackingNumber", maxLength: 0 }, shop: { source: "storeName", maxLength: 0 } },
    { customerName: "علیرضا محمدی", orderNumber: "ZG-1002", trackingNumber: "  ", storeName: "زر گالری" },
  );
  assert.deepEqual(attributes, { name: "علیرض", order: "ZG-1002", track: "-", shop: "زر گالری" });
});

test("a pattern variable's name maps itself to the matching order value when the event offers one", () => {
  const order = smsEventInfo("orderShipped").variables;
  assert.equal(guessEventVariable("order_number", order), "orderNumber");
  assert.equal(guessEventVariable("customer_name", order), "customerName");
  assert.equal(guessEventVariable("store_name", order), "storeName");
  assert.equal(guessEventVariable("tracking", order), "trackingNumber");
  assert.equal(guessEventVariable("amount", order), "totalAmount");
  assert.equal(guessEventVariable("tracking", smsEventInfo("orderCreated").variables), null, "no tracking number before shipping");
  assert.equal(guessEventVariable("zzz", order), null);
});

test("an event rule in pattern mode needs a pattern and only values that event offers", () => {
  const ok = { orderCreated: { mode: "PATTERN", patternCode: "abc", bindings: { num: { source: "orderNumber", maxLength: 0 } } } };
  assert.equal(smsEventRulesSchema.safeParse(ok).success, true);
  assert.equal(smsEventRulesSchema.safeParse({ orderCreated: { ...ok.orderCreated, patternCode: "" } }).success, false);
  assert.equal(smsEventRulesSchema.safeParse({ orderCreated: { ...ok.orderCreated, bindings: { t: { source: "trackingNumber", maxLength: 0 } } } }).success, false);
  assert.equal(smsEventRulesSchema.safeParse({ orderCreated: { mode: "TEXT", patternCode: "", bindings: {} } }).success, true);
  assert.equal(smsEventRulesSchema.safeParse({ unknownEvent: { mode: "TEXT", patternCode: "", bindings: {} } }).success, true, "unknown keys are ignored, not fatal");
});

test("the settings patch accepts one form's slice and rejects a bad one", () => {
  assert.equal(communicationSettingsPatchSchema.safeParse({ smsEnabled: true }).success, true);
  assert.equal(communicationSettingsPatchSchema.safeParse({ orderProcessingSms: true, templates: { orderProcessing: "سفارش آماده می‌شود" } }).success, true);
  assert.equal(communicationSettingsPatchSchema.safeParse({ templates: { orderProcessing: "x".repeat(501) } }).success, false);
  assert.equal(communicationSettingsPatchSchema.safeParse({ smsEnabled: "yes" }).success, false);
});
