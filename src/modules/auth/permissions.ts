import type { UserRole } from "@generated/prisma/enums";

// `settings:manage` covers store-wide configuration (branding, homepage, content,
// payment gateways, SMS providers). It is intentionally granted to ADMIN only so the
// specialised manager roles stay scoped to their own domain.
export type AdminPermission = "dashboard:view" | "catalog:manage" | "users:manage" | "orders:manage" | "audit:view" | "settings:manage";

export const adminRoles: UserRole[] = ["ADMIN", "CATALOG_MANAGER", "USER_MANAGER", "ORDER_MANAGER"];

const rolePermissions: Record<UserRole, AdminPermission[]> = {
  CUSTOMER: [],
  ADMIN: ["dashboard:view", "catalog:manage", "users:manage", "orders:manage", "audit:view", "settings:manage"],
  CATALOG_MANAGER: ["catalog:manage"],
  USER_MANAGER: ["users:manage"],
  ORDER_MANAGER: ["dashboard:view", "orders:manage"],
};

export function hasPermission(role: UserRole, permission: AdminPermission) {
  return rolePermissions[role].includes(permission);
}

export function isAdminRole(role: UserRole) {
  return adminRoles.includes(role);
}

// Settings sections are owned by the role that owns the underlying domain; everything
// else is store-wide configuration and stays ADMIN-only.
const settingsSectionPermissions: Record<string, AdminPermission> = {
  catalog: "catalog:manage",
  orders: "orders:manage",
  commerce: "orders:manage",
};

export function settingsSectionPermission(section: string): AdminPermission {
  return settingsSectionPermissions[section] ?? "settings:manage";
}

export function canOpenSettingsSection(role: UserRole, section: string) {
  return hasPermission(role, settingsSectionPermission(section));
}

export function canOpenAnySettingsSection(role: UserRole) {
  return hasPermission(role, "settings:manage")
    || hasPermission(role, "catalog:manage")
    || hasPermission(role, "orders:manage");
}

export function adminStartPath(role: UserRole) {
  if (hasPermission(role, "dashboard:view")) return "/admin";
  if (hasPermission(role, "catalog:manage")) return "/admin/products";
  if (hasPermission(role, "users:manage")) return "/admin/users";
  if (hasPermission(role, "orders:manage")) return "/admin/orders";
  return "/";
}
