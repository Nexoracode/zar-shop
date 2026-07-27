import type { OrderStatus, ProductStatus, UserRole, UserStatus } from "@generated/prisma/enums";

export const productStatusLabels: Record<ProductStatus, string> = {
  DRAFT: "پیش‌نویس",
  ACTIVE: "منتشرشده",
  ARCHIVED: "بایگانی‌شده",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  PROCESSING: "در حال آماده‌سازی",
  SHIPPED: "ارسال‌شده",
  DELIVERED: "تحویل‌شده",
  CANCELLED: "لغوشده",
  REFUNDED: "بازپرداخت‌شده",
};

export const userRoleLabels: Record<UserRole, string> = {
  CUSTOMER: "مشتری",
  ADMIN: "مدیر کل",
  CATALOG_MANAGER: "مدیر کاتالوگ",
  USER_MANAGER: "مدیر کاربران",
  ORDER_MANAGER: "مدیر سفارش‌ها",
};

export const userStatusLabels: Record<UserStatus, string> = {
  ACTIVE: "فعال",
  SUSPENDED: "تعلیق‌شده",
};

export type AdminTone = "neutral" | "info" | "success" | "warning" | "danger" | "gold";

export const productStatusTones: Record<ProductStatus, AdminTone> = {
  DRAFT: "warning",
  ACTIVE: "success",
  ARCHIVED: "neutral",
};

export const orderStatusTones: Record<OrderStatus, AdminTone> = {
  PENDING_PAYMENT: "warning",
  PAID: "info",
  PROCESSING: "gold",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "danger",
  REFUNDED: "neutral",
};

export const userStatusTones: Record<UserStatus, AdminTone> = {
  ACTIVE: "success",
  SUSPENDED: "danger",
};
