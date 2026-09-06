import { z } from "zod";
import { normalizeNumericValue } from "@/lib/persian-numbers";

/** See `authFieldLimits`: one number per field, shared by the form control and the schema. */
export const contactFieldLimits = { name: 150, email: 191, phone: 20, subject: 191, message: 3000 } as const;

// Optional, but when given it has to be a real number — 8–15 digits covers Iranian landlines
// (with area code) and mobiles. Persian/Arabic digits are folded first so a Persian keyboard
// entry is not rejected.
const optionalPhone = z.string().trim()
  .max(contactFieldLimits.phone)
  .optional()
  .transform((value) => (value ? normalizeNumericValue(value, false) : ""))
  .refine((value) => value === "" || /^\d{8,15}$/.test(value), "شماره تماس باید بین ۸ تا ۱۵ رقم باشد.")
  .transform((value) => value || undefined);

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2).max(contactFieldLimits.name),
  email: z.email().transform((value) => value.toLowerCase()),
  phone: optionalPhone,
  subject: z.string().trim().min(3).max(contactFieldLimits.subject),
  message: z.string().trim().min(10).max(contactFieldLimits.message),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
