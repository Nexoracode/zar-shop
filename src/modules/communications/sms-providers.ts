import { z } from "zod";
import { smsProviderFieldLimits } from "@/modules/communications/limits";

export const smsProviderSchema = z.enum(["FARAZ_SMS", "IRAN_SMS"]);
export type SmsProviderId = z.infer<typeof smsProviderSchema>;

export const smsProviders = [
  {
    id: "FARAZ_SMS" as const,
    name: "فراز اس‌ام‌اس",
    signupUrl: "https://farazsms.com/",
    docsUrl: "https://docs.farazsms.com/",
    sendSupported: true,
    steps: ["در فراز اس‌ام‌اس حساب بسازید و احراز هویت را کامل کنید.", "از پنل فراز، Api-Key بسازید و در فرم وارد کنید؛ با «تست اتصال»، مشخصات حساب، سرشماره‌ها و پترن‌ها خودکار بارگذاری می‌شوند.", "سرشماره ارسال و پترن کد تأیید (OTP) را از فهرست انتخاب کنید؛ اگر پترن ندارید، از بخش «پترن‌های پیامک» بسازید و تأییدیه بگیرید."],
  },
  {
    id: "IRAN_SMS" as const,
    name: "ایران اس‌ام‌اس",
    signupUrl: "https://iransms.com/",
    docsUrl: "https://iransms.com/",
    sendSupported: false,
    steps: ["در ایران اس‌ام‌اس حساب بسازید و پنل را فعال کنید.", "از پشتیبانی، دسترسی وب‌سرویس و مشخصات خط خدماتی را دریافت کنید.", "نام کاربری، رمز وب‌سرویس و سرشماره را در فرم ثبت کنید."],
  },
] as const;

export const smsProviderInputSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("FARAZ_SMS"),
    // Optional so an edit can keep the stored key: the route falls back to it when this is blank
    // and rejects the save when there is neither. A key that *is* typed must still be a real one.
    apiKey: z.string().trim().max(smsProviderFieldLimits.apiKey).refine((value) => value === "" || value.length >= 20, "API Key معتبر نیست؛ کلید کامل را از پنل فراز کپی کنید.").optional(),
    // Faraz's `line_number` is digits only (`^[0-9]+$`) — a leading "+" is rejected by its API.
    senderNumber: z.string().trim().regex(/^\d{3,20}$/, "سرشماره فقط شامل رقم است و ۳ تا ۲۰ رقم دارد."),
    otpPatternCode: z.string().trim().min(1).max(smsProviderFieldLimits.otpPatternCode),
    // The pattern's variable names are whatever the admin chose when creating it on Faraz's
    // side — nothing here requires specific names like "otp"/"name", so these map this store's
    // OTP code and store name onto whichever variables the chosen pattern actually declares.
    otpCodeVariable: z.string().trim().min(1).max(smsProviderFieldLimits.otpVariableName),
    otpNameVariable: z.string().trim().max(smsProviderFieldLimits.otpVariableName).optional(),
  }),
  z.object({ provider: z.literal("IRAN_SMS"), username: z.string().trim().min(2).max(smsProviderFieldLimits.username), password: z.string().min(4).max(smsProviderFieldLimits.password), senderNumber: z.string().trim().regex(/^\+?\d{3,20}$/) }),
]);

export function smsProviderInfo(provider: SmsProviderId) {
  return smsProviders.find((item) => item.id === provider)!;
}
