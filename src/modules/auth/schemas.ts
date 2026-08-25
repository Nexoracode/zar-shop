import { z } from "zod";
import { normalizeNumericValue } from "@/lib/persian-numbers";

/**
 * Maximum length of each field. Forms read these for their `maxLength`, so a limit is enforced
 * on the control and validated here from one number rather than two that can drift apart.
 */
export const authFieldLimits = {
  phone: 11,
  otpCode: 6,
  password: 72,
  firstName: 100,
  lastName: 100,
} as const;

export const phoneSchema = z.string().trim().transform((value) => normalizeNumericValue(value, false)).pipe(z.string().regex(/^09\d{9}$/, "شماره موبایل باید به‌صورت 09xxxxxxxxx باشد."));

export const otpCodeSchema = z.string().trim().regex(/^\d{6}$/, "کد تایید باید ۶ رقم باشد.");
export const newPasswordSchema = z.string()
  .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد.")
  .max(authFieldLimits.password, "رمز عبور خیلی طولانی است.")
  .regex(/[A-Za-z]/, "رمز عبور باید شامل حرف انگلیسی باشد.")
  .regex(/\d/, "رمز عبور باید شامل عدد باشد.");

export const phoneCheckSchema = z.object({ phone: phoneSchema });

export const otpRequestSchema = z.object({ phone: phoneSchema, purpose: z.enum(["REGISTER", "LOGIN", "RESET_PASSWORD"]) });

export const otpVerifySchema = z.object({ phone: phoneSchema, purpose: z.enum(["REGISTER", "LOGIN"]), code: otpCodeSchema });

// Name is intentionally optional here — Digikala-style registration only asks for a
// password once the phone is verified; first/last name can be completed later from the
// account profile.
export const registerCompleteSchema = z.object({
  phone: phoneSchema,
  firstName: z.string().trim().min(2, "نام باید حداقل ۲ حرف باشد.").max(authFieldLimits.firstName).optional(),
  lastName: z.string().trim().min(2, "نام خانوادگی باید حداقل ۲ حرف باشد.").max(authFieldLimits.lastName).optional(),
  smsMarketingConsent: z.boolean().default(false),
  password: newPasswordSchema,
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1).max(authFieldLimits.password),
});

export const forgotPasswordSchema = z.object({ phone: phoneSchema });

export const resetPasswordSchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
  password: newPasswordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(authFieldLimits.password),
  newPassword: newPasswordSchema,
});
