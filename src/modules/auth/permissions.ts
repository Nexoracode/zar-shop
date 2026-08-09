import type { UserRole } from "@generated/prisma/enums";

export type AdminPermission = "dashboard:view" | "catalog:manage" | "users:manage" | "orders:manage" | "audit:view";

export const adminRoles: UserRole[] = ["ADMIN", "CATALOG_MANAGER", "USER_MANAGER", "ORDER_MANAGER"];

const rolePermissions: Record<UserRole, AdminPermission[]> = {
  CUSTOMER: [],
  ADMIN: ["dashboard:view", "catalog:manage", "users:manage", "orders:manage", "audit:view"],
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

export function adminStartPath(role: UserRole) {
  if (hasPermission(role, "dashboard:view")) return "/admin";
  if (hasPermission(role, "catalog:manage")) return "/admin/products";
  if (hasPermission(role, "users:manage")) return "/admin/users";
  if (hasPermission(role, "orders:manage")) return "/admin/orders";
  return "/";
}
