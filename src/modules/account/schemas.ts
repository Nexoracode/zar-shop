import { z } from "zod";
import { normalizeNumericValue } from "@/lib/persian-numbers";

const digits = (length: number) => z.string().transform((value) => normalizeNumericValue(value, false)).pipe(z.string().regex(new RegExp(`^\\d{${length}}$`)));
const optionalShortText = z.string().trim().max(20).optional().transform((value) => value || null);

export const profileInputSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  phone: z.string().transform((value) => normalizeNumericValue(value, false)).pipe(z.string().regex(/^09\d{9}$/)),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  nationalId: z.union([digits(10), z.literal("")]).transform((value) => value || null),
});

export const addressInputSchema = z.object({
  title: z.string().trim().min(2).max(100),
  recipientType: z.enum(["SELF", "OTHER"]),
  recipient: z.string().trim().min(3).max(150),
  recipientNationalId: z.union([digits(10), z.literal("")]).optional().transform((value) => value || null),
  phone: z.string().transform((value) => normalizeNumericValue(value, false)).pipe(z.string().regex(/^09\d{9}$/)),
  provinceId: z.string().cuid(),
  cityId: z.string().cuid(),
  postalCode: digits(10),
  addressLine: z.string().trim().min(10).max(1000),
  plaque: z.string().trim().min(1).max(20),
  unit: optionalShortText,
  floor: optionalShortText,
  latitude: z.coerce.number().min(24).max(40).nullable().optional(),
  longitude: z.coerce.number().min(43).max(64).nullable().optional(),
  isDefault: z.boolean().default(false),
}).superRefine((value, context) => {
  if (value.recipientType === "OTHER" && !value.recipientNationalId) context.addIssue({ code: "custom", path: ["recipientNationalId"], message: "کد ملی گیرنده لازم است." });
});

export const addressPatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set-default") }),
  z.object({ action: z.literal("update"), data: addressInputSchema }),
]);
