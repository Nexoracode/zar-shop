import assert from "node:assert/strict";
import test from "node:test";
import {
  adminRoles,
  canOpenAnySettingsSection,
  canOpenSettingsSection,
  hasPermission,
  isAdminRole,
  settingsSectionPermission,
} from "./permissions";

test("store-wide settings are reserved for ADMIN", () => {
  assert.equal(hasPermission("ADMIN", "settings:manage"), true);
  for (const role of ["CUSTOMER", "CATALOG_MANAGER", "USER_MANAGER", "ORDER_MANAGER"] as const) {
    assert.equal(hasPermission(role, "settings:manage"), false, `${role} must not manage store settings`);
  }
});

test("settings sections map to the role that owns the domain", () => {
  assert.equal(settingsSectionPermission("catalog"), "catalog:manage");
  assert.equal(settingsSectionPermission("orders"), "orders:manage");
  assert.equal(settingsSectionPermission("commerce"), "orders:manage");
  for (const section of ["general", "homepage", "branding", "content", "seo", "payment-gateways", "notifications"]) {
    assert.equal(settingsSectionPermission(section), "settings:manage", `${section} must stay ADMIN-only`);
  }
  assert.equal(settingsSectionPermission("unknown-section"), "settings:manage");
});

test("a catalog manager only reaches the catalog settings section", () => {
  assert.equal(canOpenSettingsSection("CATALOG_MANAGER", "catalog"), true);
  assert.equal(canOpenSettingsSection("CATALOG_MANAGER", "branding"), false);
  assert.equal(canOpenSettingsSection("CATALOG_MANAGER", "payment-gateways"), false);
  assert.equal(canOpenSettingsSection("CATALOG_MANAGER", "notifications"), false);
});

test("an order manager only reaches the order and commerce settings sections", () => {
  assert.equal(canOpenSettingsSection("ORDER_MANAGER", "orders"), true);
  assert.equal(canOpenSettingsSection("ORDER_MANAGER", "commerce"), true);
  assert.equal(canOpenSettingsSection("ORDER_MANAGER", "general"), false);
  assert.equal(canOpenSettingsSection("ORDER_MANAGER", "payment-gateways"), false);
});

test("the settings hub is hidden from roles that own no section", () => {
  assert.equal(canOpenAnySettingsSection("ADMIN"), true);
  assert.equal(canOpenAnySettingsSection("CATALOG_MANAGER"), true);
  assert.equal(canOpenAnySettingsSection("ORDER_MANAGER"), true);
  assert.equal(canOpenAnySettingsSection("USER_MANAGER"), false);
  assert.equal(canOpenAnySettingsSection("CUSTOMER"), false);
});

test("admin roles stay separate from customers", () => {
  assert.deepEqual(adminRoles, ["ADMIN", "CATALOG_MANAGER", "USER_MANAGER", "ORDER_MANAGER"]);
  assert.equal(isAdminRole("CUSTOMER"), false);
  for (const role of adminRoles) assert.equal(isAdminRole(role), true);
});
