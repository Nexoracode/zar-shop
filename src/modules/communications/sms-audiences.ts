import { z } from "zod";

export const smsAudienceSchema = z.enum(["ALL_OPTED_IN", "RECENT_30_DAYS", "HAS_ORDERS", "NO_ORDERS", "PURCHASED_30_DAYS", "INACTIVE_90_DAYS"]);
export type SmsAudience = z.infer<typeof smsAudienceSchema>;

export const smsAudienceOptions = [
  { value: "ALL_OPTED_IN", label: "همه کاربران دارای رضایت پیامک" },
  { value: "RECENT_30_DAYS", label: "ثبت‌نام‌شده‌های ۳۰ روز اخیر" },
  { value: "HAS_ORDERS", label: "مشتریان دارای سفارش" },
  { value: "NO_ORDERS", label: "کاربران بدون سفارش" },
  { value: "PURCHASED_30_DAYS", label: "خریداران ۳۰ روز اخیر" },
  { value: "INACTIVE_90_DAYS", label: "کاربران غیرفعال بیش از ۹۰ روز" },
] as const;
