export type AuditActionKind = "CREATE" | "UPDATE" | "DELETE" | "ACCESS" | "SYSTEM";

const actionLabels: Record<string, string> = {
  PRODUCT_CREATE: "ثبت محصول",
  PRODUCT_UPDATE: "ویرایش محصول",
  PRODUCT_DELETE: "حذف محصول",
  PRODUCT_DUPLICATE: "تکثیر محصول",
  PRODUCT_STATUS_UPDATE: "تغییر وضعیت محصول",
  PRODUCT_BULK_EDIT: "ویرایش گروهی محصولات",
  PRODUCT_REVIEW_APPROVE: "تأیید دیدگاه محصول",
  PRODUCT_REVIEW_REJECT: "رد دیدگاه محصول",
  PRODUCT_REVIEW_DELETE: "حذف دیدگاه محصول",
  PRODUCT_REVIEW_REPLY: "پاسخ مدیریت به دیدگاه",
  PRODUCT_REVIEW_REPORT_UPDATE: "رسیدگی به گزارش دیدگاه",
  CATEGORY_CREATE: "ثبت دسته‌بندی",
  CATEGORY_UPDATE: "ویرایش دسته‌بندی",
  CATEGORY_DELETE: "حذف دسته‌بندی",
  CATEGORY_ATTRIBUTES_UPDATE: "ویرایش ویژگی‌های دسته‌بندی",
  OPTION_TYPE_CREATE: "ثبت نوع تنوع",
  OPTION_TYPE_UPDATE: "ویرایش نوع تنوع",
  OPTION_TYPE_DELETE: "حذف نوع تنوع",
  OPTION_VALUE_DELETE: "حذف مقدار تنوع",
  COLOR_CREATE: "ثبت رنگ",
  COLOR_UPDATE: "ویرایش رنگ",
  COLOR_DELETE: "حذف رنگ",
  BRAND_CREATE: "ثبت برند",
  BRAND_UPDATE: "ویرایش برند",
  BRAND_DELETE: "حذف برند",
  SHIPPING_METHOD_CREATE: "ثبت روش ارسال",
  SHIPPING_METHOD_UPDATE: "ویرایش روش ارسال",
  SHIPPING_METHOD_DELETE: "حذف روش ارسال",
  MEDIA_UPLOAD: "بارگذاری رسانه",
  MEDIA_UPDATE: "ویرایش رسانه",
  MEDIA_DELETE: "حذف رسانه",
  PROMOTION_CREATE: "ثبت پروموشن",
  PROMOTION_UPDATE: "ویرایش پروموشن",
  PROMOTION_DELETE: "حذف پروموشن",
  USER_CREATE: "ثبت کاربر",
  USER_ROLE_UPDATE: "تغییر نقش کاربر",
  BULK_UPDATE: "ویرایش گروهی",
  GENERAL_SETTINGS_UPDATE: "ویرایش تنظیمات عمومی",
  BRAND_SETTINGS_UPDATE: "ویرایش ظاهر و برند",
  CATALOG_SETTINGS_UPDATE: "ویرایش تنظیمات محصولات",
  ORDER_SETTINGS_UPDATE: "ویرایش تنظیمات سفارش",
  COMMERCE_SETTINGS_UPDATE: "ویرایش تنظیمات ارسال و پرداخت",
  HOMEPAGE_SETTINGS_UPDATE: "ویرایش تنظیمات صفحه اصلی",
  HOMEPAGE_HERO_SETTINGS_UPDATE: "ویرایش اسلایدر صفحه اصلی",
  HOMEPAGE_TILES_SETTINGS_UPDATE: "ویرایش تایل‌های صفحه اصلی",
  HOMEPAGE_LAYOUT_SETTINGS_UPDATE: "ویرایش چینش صفحه اصلی",
  HOMEPAGE_PROMO_SETTINGS_UPDATE: "ویرایش پروموبنر صفحه اصلی",
  HOMEPAGE_MENU_SETTINGS_UPDATE: "ویرایش منوی صفحه اصلی",
  CONTENT_SETTINGS_UPDATE: "ویرایش محتوا و FAQ",
  COMMUNICATION_SETTINGS_UPDATE: "ویرایش تنظیمات پیامک",
  PAYMENT_GATEWAY_CONFIG_UPSERT: "ثبت یا ویرایش درگاه پرداخت",
  PAYMENT_GATEWAY_CONFIG_DELETE: "حذف درگاه پرداخت",
  SMS_PROVIDER_CONFIG_UPSERT: "ثبت یا ویرایش سامانه پیامک",
  SMS_PROVIDER_ACTIVATE: "فعال‌سازی سامانه پیامک",
  SMS_PROVIDER_CONFIG_DELETE: "حذف سامانه پیامک",
  MANUAL_SMS_SEND: "ارسال دستی پیامک",
  MANUAL_SMS_DELETE: "حذف سابقه پیامک",
  ORDER_AUTO_EXPIRED: "انقضای خودکار سفارش",
  ORDER_EXPIRATION_NOTIFICATION: "هشدار انقضای سفارش",
  ORDER_STATUS_UPDATE: "تغییر وضعیت سفارش",
  ORDER_MANUAL_CREATE: "ثبت دستی سفارش",
  ORDER_TRACKING_UPDATE: "ثبت کد رهگیری سفارش",
  PAID_ORDER_INVENTORY_SHORTAGE: "کسری موجودی سفارش پرداخت‌شده",
  ADMIN_LOGIN: "ورود به پنل مدیریت",
  ADMIN_LOGOUT: "خروج از پنل مدیریت",
  TICKET_CREATE: "ثبت تیکت پشتیبانی",
  TICKET_MESSAGE_SEND: "ارسال پیام تیکت",
  TICKET_STATUS_UPDATE: "تغییر وضعیت تیکت",
  TICKET_RATING_SUBMIT: "ثبت امتیاز تیکت",
  TICKET_CATEGORY_CREATE: "ثبت موضوع تیکت",
  TICKET_CATEGORY_UPDATE: "ویرایش موضوع تیکت",
  TICKET_CATEGORY_DELETE: "حذف موضوع تیکت",
  CONTACT_MESSAGE_UPDATE: "تغییر وضعیت پیام تماس",
  RETURN_STATUS_UPDATE: "تغییر وضعیت درخواست مرجوعی",
  GOLD_PRICE_REFRESH: "بروزرسانی دستی نرخ طلا",
};

const entityLabels: Record<string, string> = {
  Product: "محصول",
  ProductReview: "دیدگاه محصول",
  ProductReviewReport: "گزارش دیدگاه",
  Category: "دسته‌بندی",
  Color: "رنگ",
  Brand: "برند",
  OptionType: "نوع تنوع",
  OptionValue: "مقدار تنوع",
  MediaAsset: "رسانه",
  Promotion: "پروموشن",
  User: "کاربر",
  Order: "سفارش",
  ShippingMethod: "روش ارسال",
  ContactMessage: "پیام تماس",
  Return: "درخواست مرجوعی",
  GoldPrice: "نرخ طلا",
  StoreSetting: "تنظیمات فروشگاه",
  CommunicationSetting: "تنظیمات ارتباطی",
  PaymentGatewayConfig: "درگاه پرداخت",
  SmsProviderConfig: "سامانه پیامک",
  SmsCampaign: "پیامک دستی",
  Session: "نشست مدیریتی",
  products: "محصولات",
  categories: "دسته‌بندی‌ها",
  brands: "برندها",
  colors: "رنگ‌ها",
  optionTypes: "انواع تنوع",
  orders: "سفارش‌ها",
  users: "کاربران",
  reviews: "دیدگاه‌ها",
  promotions: "پروموشن‌ها",
  contactMessages: "پیام‌های تماس",
  returns: "درخواست‌های مرجوعی",
  paymentGateways: "درگاه‌های پرداخت",
  smsProviders: "سامانه‌های پیامک",
  smsCampaigns: "پیامک‌های دستی",
  shippingMethods: "روش‌های ارسال",
  supportTicketCategories: "موضوعات تیکت",
  tickets: "تیکت‌ها",
  SupportTicket: "تیکت پشتیبانی",
  SupportTicketMessage: "پیام تیکت",
  SupportTicketCategory: "موضوع تیکت",
};

const sensitiveKey = /password|secret|token|credential|api[-_]?key|authorization|cookie/i;

export function auditActionLabel(action: string) {
  return actionLabels[action] ?? action.replaceAll("_", " ");
}

export function auditEntityLabel(entityType: string) {
  return entityLabels[entityType] ?? entityType;
}

export function auditActionKind(action: string): AuditActionKind {
  if (action === "ADMIN_LOGIN" || action === "ADMIN_LOGOUT") return "ACCESS";
  if (action.includes("DELETE")) return "DELETE";
  if (action.includes("CREATE") || action.includes("UPLOAD") || action.includes("SEND") || action.includes("DUPLICATE")) return "CREATE";
  if (action.includes("AUTO_") || action.includes("NOTIFICATION") || action === "PAID_ORDER_INVENTORY_SHORTAGE") return "SYSTEM";
  return "UPDATE";
}

export function sanitizeAuditMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAuditMetadata);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sensitiveKey.test(key) ? "[پنهان‌شده]" : sanitizeAuditMetadata(item)]));
}

export function auditActorName(actor: { firstName: string | null; lastName: string | null; phone: string | null } | null) {
  if (!actor) return "سیستم";
  return `${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim() || actor.phone || "کاربر بدون نام";
}
