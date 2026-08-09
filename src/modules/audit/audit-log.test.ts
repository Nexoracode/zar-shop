import assert from "node:assert/strict";
import test from "node:test";
import { auditActionKind, auditActionLabel, sanitizeAuditMetadata } from "./audit-log";
import { hasPermission } from "@/modules/auth/permissions";

test("audit actions have readable labels and stable kinds", () => {
  assert.equal(auditActionLabel("PRODUCT_CREATE"), "ثبت محصول");
  assert.equal(auditActionKind("PRODUCT_CREATE"), "CREATE");
  assert.equal(auditActionKind("PROMOTION_DELETE"), "DELETE");
  assert.equal(auditActionKind("ADMIN_LOGIN"), "ACCESS");
});

test("audit metadata recursively hides sensitive values", () => {
  assert.deepEqual(sanitizeAuditMetadata({ provider: "zarinpal", credential: "private", nested: { apiKey: "secret", enabled: true } }), {
    provider: "zarinpal",
    credential: "[پنهان‌شده]",
    nested: { apiKey: "[پنهان‌شده]", enabled: true },
  });
});

test("only the primary admin role can view audit logs", () => {
  assert.equal(hasPermission("ADMIN", "audit:view"), true);
  assert.equal(hasPermission("CATALOG_MANAGER", "audit:view"), false);
  assert.equal(hasPermission("USER_MANAGER", "audit:view"), false);
  assert.equal(hasPermission("ORDER_MANAGER", "audit:view"), false);
});
