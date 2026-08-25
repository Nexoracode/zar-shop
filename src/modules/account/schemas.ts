import { z } from "zod";
import { normalizeNumericValue } from "@/lib/persian-numbers";

const digits = (length: number) => z.string().transform((value) => normalizeNumericValue(value, false)).pipe(z.string().regex(new RegExp(`^\\d{${length}}$`)));
/** See `authFieldLimits`: one number per field, shared by the form control and the schema. */
export const profileFieldLimits = { firstName: 100, lastName: 100, phone: 11, email: 191, nationalId: 10 } as const;
export const addressFieldLimits = {
  title: 100,
  recipient: 150,
  phone: 11,
  postalCode: 10,
  addressLine: 1000,
  plaque: 20,
  unit: 20,
  floor: 20,
} as const;

const optionalShortText = z.string().trim().max(addressFieldLimits.unit).optional().transform((value) => value || null);

export const profileInputSchema = z.object({
  firstName: z.string().trim().min(2).max(profileFieldLimits.firstName),
  lastName: z.string().trim().min(2).max(profileFieldLimits.lastName),
  phone: z.string().transform((value) => normalizeNumericValue(value, false)).pipe(z.string().regex(/^09\d{9}$/)),
  email: z.union([z.email(), z.literal("")]).optional().transform((value) => (value ? value.trim().toLowerCase() : null)),
  nationalId: z.union([digits(10), z.literal("")]).transform((value) => value || null),
});

export const addressInputSchema = z.object({
  title: z.string().trim().min(2).max(addressFieldLimits.title),
  recipientType: z.enum(["SELF", "OTHER"]),
  recipient: z.string().trim().min(3).max(addressFieldLimits.recipient),
  phone: z.string().transform((value) => normalizeNumericValue(value, false)).pipe(z.string().regex(/^09\d{9}$/)),
  provinceId: z.string().cuid(),
  cityId: z.string().cuid(),
  postalCode: digits(10),
  addressLine: z.string().trim().min(10).max(addressFieldLimits.addressLine),
  plaque: z.string().trim().min(1).max(addressFieldLimits.plaque),
  unit: optionalShortText,
  floor: optionalShortText,
  latitude: z.coerce.number().min(24).max(40).nullable().optional(),
  longitude: z.coerce.number().min(43).max(64).nullable().optional(),
  isDefault: z.boolean().default(false),
});

export const addressPatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set-default") }),
  z.object({ action: z.literal("update"), data: addressInputSchema }),
]);
