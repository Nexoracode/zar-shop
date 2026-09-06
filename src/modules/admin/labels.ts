import type { OrderStatus, PaymentStatus, ProductReviewReportStatus, ProductReviewStatus, ProductStatus, ReturnStatus, TicketStatus, UserRole, UserStatus } from "@generated/prisma/enums";

export const productStatusLabels: Record<ProductStatus, string> = {
  DRAFT: "پیش‌نویس",
  ACTIVE: "منتشرشده",
  ARCHIVED: "بایگانی‌شده",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  EXPIRED: "منقضی‌شده",
  PAID: "پرداخت‌شده",
  PROCESSING: "در حال آماده‌سازی",
  SHIPPED: "ارسال‌شده",
  DELIVERED: "تحویل‌شده",
  CANCELLED: "لغوشده",
  REFUNDED: "بازپرداخت‌شده",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  INITIATED: "آغازشده",
  PENDING: "در انتظار پرداخت",
  SUCCESS: "موفق",
  FAILED: "ناموفق",
  CANCELLED: "لغوشده",
  REFUNDED: "بازپرداخت‌شده",
};

export const returnStatusLabels: Record<ReturnStatus, string> = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تأییدشده",
  REJECTED: "ردشده",
  COMPLETED: "تکمیل‌شده",
};

export const userRoleLabels: Record<UserRole, string> = {
  CUSTOMER: "مشتری",
  ADMIN: "مدیر کل",
  CATALOG_MANAGER: "مدیر کاتالوگ",
  USER_MANAGER: "مدیر کاربران",
  ORDER_MANAGER: "مدیر سفارش‌ها",
  SUPPORT_MANAGER: "مدیر پشتیبانی",
};

export const userStatusLabels: Record<UserStatus, string> = {
  ACTIVE: "فعال",
  SUSPENDED: "تعلیق‌شده",
};

export const ticketStatusLabels: Record<TicketStatus, string> = {
  OPEN: "باز",
  ANSWERED: "پاسخ داده‌شده",
  CLOSED: "بسته‌شده",
};

export const reviewStatusLabels: Record<ProductReviewStatus, string> = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تأییدشده",
  REJECTED: "ردشده",
};

export const reviewReportStatusLabels: Record<ProductReviewReportStatus, string> = {
  PENDING: "در انتظار رسیدگی",
  RESOLVED: "رسیدگی‌شده",
  DISMISSED: "ردشده",
};

export const reviewReportReasonLabels: Record<string, string> = {
  SPAM: "هرزنامه",
  ABUSE: "توهین‌آمیز",
  MISINFORMATION: "اطلاعات نادرست",
  IRRELEVANT: "نامرتبط",
  OTHER: "سایر موارد",
};

export type AdminTone = "neutral" | "info" | "success" | "warning" | "danger" | "gold";

export const productStatusTones: Record<ProductStatus, AdminTone> = {
  DRAFT: "warning",
  ACTIVE: "success",
  ARCHIVED: "info",
};

export const orderStatusTones: Record<OrderStatus, AdminTone> = {
  PENDING_PAYMENT: "warning",
  EXPIRED: "neutral",
  PAID: "info",
  PROCESSING: "gold",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "danger",
  REFUNDED: "neutral",
};

export const paymentStatusTones: Record<PaymentStatus, AdminTone> = {
  INITIATED: "neutral",
  PENDING: "warning",
  SUCCESS: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
  REFUNDED: "info",
};

export const returnStatusTones: Record<ReturnStatus, AdminTone> = {
  PENDING: "warning",
  APPROVED: "info",
  REJECTED: "danger",
  COMPLETED: "success",
};

export const userStatusTones: Record<UserStatus, AdminTone> = {
  ACTIVE: "success",
  SUSPENDED: "danger",
};

export const ticketStatusTones: Record<TicketStatus, AdminTone> = {
  OPEN: "warning",
  ANSWERED: "info",
  CLOSED: "neutral",
};

export const reviewStatusTones: Record<ProductReviewStatus, AdminTone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

export const reviewReportStatusTones: Record<ProductReviewReportStatus, AdminTone> = {
  PENDING: "warning",
  RESOLVED: "success",
  DISMISSED: "neutral",
};
