import { z } from "zod";

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.email().transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(20).optional().transform((value) => value || undefined),
  subject: z.string().trim().min(3).max(191),
  message: z.string().trim().min(10).max(3000),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
