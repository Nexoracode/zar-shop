import assert from "node:assert/strict";
import test from "node:test";
import { decryptGatewayCredential, encryptGatewayCredential, maskGatewayCredential } from "@/modules/payments/gateway-config";
import { gatewayProviderSchema } from "@/modules/payments/gateway-providers";

test("payment gateway credentials are encrypted and can be recovered server-side", () => {
  const credential = "845b5d38-3c62-11ea-b338-000c295eb8fc";
  const encrypted = encryptGatewayCredential(credential);
  assert.notEqual(encrypted, credential);
  assert.equal(decryptGatewayCredential(encrypted), credential);
  assert.ok(!encrypted.includes(credential));
});

test("masked gateway credentials expose only the final four characters", () => {
  const masked = maskGatewayCredential("merchant-secret-1234");
  assert.ok(masked.endsWith("1234"));
  assert.ok(!masked.includes("merchant-secret"));
});

test("only suggested payment gateway providers are accepted", () => {
  assert.equal(gatewayProviderSchema.parse("ZIBAL"), "ZIBAL");
  assert.throws(() => gatewayProviderSchema.parse("UNKNOWN"));
});
