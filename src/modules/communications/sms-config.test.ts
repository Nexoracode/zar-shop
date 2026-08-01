import assert from "node:assert/strict";
import test from "node:test";
import { decryptSmsCredentials, encryptSmsCredentials, maskSmsCredential } from "@/modules/communications/sms-config";
import { communicationSettingsSchema } from "@/modules/communications/communication-settings";
import { manualSmsSchema } from "@/modules/communications/sms-service";
import { smsAudienceSchema } from "@/modules/communications/sms-audiences";
import { smsProviderInputSchema } from "@/modules/communications/sms-providers";

test("SMS provider credentials are encrypted as an authenticated envelope", () => {
  const credentials = { apiKey: "secret-api-key-for-sms-provider" };
  const encrypted = encryptSmsCredentials(credentials);
  assert.deepEqual(decryptSmsCredentials(encrypted), credentials);
  assert.ok(!encrypted.includes(credentials.apiKey));
});

test("SMS credentials expose only their final four characters", () => {
  const masked = maskSmsCredential("provider-secret-1234");
  assert.ok(masked.endsWith("1234"));
  assert.ok(!masked.includes("provider-secret"));
});

test("provider and manual campaign inputs are allow-listed", () => {
  assert.equal(smsProviderInputSchema.safeParse({ provider: "FARAZ_SMS", apiKey: "a".repeat(20), senderNumber: "+983000505" }).success, true);
  assert.equal(smsProviderInputSchema.safeParse({ provider: "UNKNOWN", apiKey: "a".repeat(20), senderNumber: "3000" }).success, false);
  assert.equal(smsAudienceSchema.parse("PURCHASED_30_DAYS"), "PURCHASED_30_DAYS");
  assert.equal(manualSmsSchema.safeParse({ mode: "AUDIENCE", audience: "ALL_OPTED_IN", message: "پیام تست" }).success, true);
  assert.equal(manualSmsSchema.safeParse({ mode: "DIRECT", phone: "09123456789", message: "پیام تست" }).success, true);
  assert.equal(manualSmsSchema.safeParse({ mode: "DIRECT", phone: "08123456789", message: "پیام تست" }).success, false);
});

test("communication settings require bounded templates", () => {
  const result = communicationSettingsSchema.safeParse({ smsEnabled: true, inAppEnabled: true, adminPhone: null, orderCreatedSms: true, paymentSuccessSms: true, orderShippedSms: true, orderExpiredSms: false, lowStockAdminSms: false, templates: {} });
  assert.equal(result.success, true);
  assert.equal(communicationSettingsSchema.safeParse({ ...result.data, templates: { ...result.data?.templates, orderCreated: "x".repeat(501) } }).success, false);
});
