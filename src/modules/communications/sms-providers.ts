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
    steps: ["در فراز اس‌ام‌اس حساب بسازید و احراز هویت را کامل کنید.", "از پنل، Api-Key را بسازید و سرشماره (line_number) اختصاص‌یافته به حساب را همراه کلید در فرم وارد کنید.", "یک پترن کد تأیید (OTP) با نام‌های دلخواه برای متغیرها بسازید و تأیید بگیرید؛ کد پترن و نام متغیرها را در همین فرم مشخص می‌کنید."],
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
    apiKey: z.string().trim().min(20).max(smsProviderFieldLimits.apiKey),
    senderNumber: z.string().trim().regex(/^\+?\d{3,20}$/),
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
