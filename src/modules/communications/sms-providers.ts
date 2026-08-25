import { z } from "zod";

export const smsProviderSchema = z.enum(["FARAZ_SMS", "IRAN_SMS"]);
export type SmsProviderId = z.infer<typeof smsProviderSchema>;

export const smsProviders = [
  {
    id: "FARAZ_SMS" as const,
    name: "فراز اس‌ام‌اس",
    signupUrl: "https://farazsms.com/",
    docsUrl: "https://ippanelcom.github.io/Edge-Document/fa/docs/",
    sendSupported: true,
    steps: ["در فراز اس‌ام‌اس حساب بسازید و احراز هویت را کامل کنید.", "از حساب کاربری ← برنامه‌نویسان ← کلیدهای دسترسی، API Key بسازید.", "سرشماره خدماتی اختصاص‌یافته به حساب را همراه کلید در فرم وارد کنید."],
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

/** See `authFieldLimits`: one number per field, shared by the form control and the schema. */
export const smsProviderFieldLimits = { apiKey: 500, username: 191, password: 500, senderNumber: 20 } as const;

export const smsProviderInputSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("FARAZ_SMS"), apiKey: z.string().trim().min(20).max(smsProviderFieldLimits.apiKey), senderNumber: z.string().trim().regex(/^\+?\d{3,20}$/) }),
  z.object({ provider: z.literal("IRAN_SMS"), username: z.string().trim().min(2).max(smsProviderFieldLimits.username), password: z.string().min(4).max(smsProviderFieldLimits.password), senderNumber: z.string().trim().regex(/^\+?\d{3,20}$/) }),
]);

export function smsProviderInfo(provider: SmsProviderId) {
  return smsProviders.find((item) => item.id === provider)!;
}
