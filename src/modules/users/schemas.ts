import { z } from "zod";
import { authFieldLimits, newPasswordSchema, phoneSchema } from "@/modules/auth/schemas";

/** One number per field, shared by the form control and the schema. */
export const userFieldLimits = { email: 191 } as const;

/** Every role/status the admin panel can assign — kept as a literal list here rather than
 * reading the generated Prisma enum, so this schema stays a plain zod module with no runtime
 * dependency on `@generated/prisma`. */
export const assignableUserRoles = ["CUSTOMER", "ADMIN", "CATALOG_MANAGER", "USER_MANAGER", "ORDER_MANAGER", "SUPPORT_MANAGER"] as const;
export const assignableUserStatuses = ["ACTIVE", "SUSPENDED"] as const;

/**
 * An admin-created account skips the public OTP flow entirely — the admin sets the password
 * directly, since nothing in the project builds an invite/temporary-password flow. Phone is
 * required even though the column is nullable: login is phone-only, so a user created without
 * one could never sign in.
 */
export const adminCreateUserSchema = z.object({
  phone: phoneSchema,
  firstName: z.string().trim().max(authFieldLimits.firstName, "نام بیش از حد مجاز است.").optional(),
  lastName: z.string().trim().max(authFieldLimits.lastName, "نام خانوادگی بیش از حد مجاز است.").optional(),
  email: z.string().trim().toLowerCase().max(userFieldLimits.email, "ایمیل بیش از حد مجاز است.").email("ایمیل معتبر نیست.").optional(),
  password: newPasswordSchema,
  role: z.enum(assignableUserRoles, "نقش انتخاب‌شده معتبر نیست."),
  status: z.enum(assignableUserStatuses, "وضعیت انتخاب‌شده معتبر نیست.").default("ACTIVE"),
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
