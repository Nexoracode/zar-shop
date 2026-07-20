import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  email: z.email().transform((v) => v.toLowerCase()),
  phone: z.string().regex(/^09\d{9}$/),
  password: z.string().min(8).max(72).regex(/[A-Za-z]/).regex(/\d/),
});

export const loginSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(72),
});
