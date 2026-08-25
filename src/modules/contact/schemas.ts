import { z } from "zod";

/** See `authFieldLimits`: one number per field, shared by the form control and the schema. */
export const contactFieldLimits = { name: 150, email: 191, phone: 20, subject: 191, message: 3000 } as const;

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2).max(contactFieldLimits.name),
  email: z.email().transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(contactFieldLimits.phone).optional().transform((value) => value || undefined),
  subject: z.string().trim().min(3).max(contactFieldLimits.subject),
  message: z.string().trim().min(10).max(contactFieldLimits.message),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
