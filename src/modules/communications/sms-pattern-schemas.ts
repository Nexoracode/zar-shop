import { z } from "zod";
import { smsPatternFieldLimits } from "@/modules/communications/limits";

/*
 * Pure schemas and constants for SMS patterns — no `db`/`node:crypto` import, unlike
 * sms-patterns.ts. A client component (the admin pattern form) needs `smsPatternCategories` and
 * the `SmsPattern` type at runtime; importing those from a module that also pulls in Prisma would
 * bundle the database client into the browser build ("Module not found: Can't resolve 'fs'").
 */

export const smsPatternCategories = [
  { value: 1, label: "کد تأیید (OTP)" },
  { value: 2, label: "باشگاه مشتریان" },
  { value: 3, label: "سفارش" },
  { value: 255, label: "سایر" },
] as const;
const patternCategorySchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(255)]);

export const smsPatternVariableSchema = z.object({
  var: z.string().trim().min(1).max(smsPatternFieldLimits.variableName),
  length: z.coerce.number().int().min(1).max(500),
  type: z.enum(["string", "int"]),
});

export const smsPatternInputSchema = z.object({
  text: z.string().trim().min(1).max(smsPatternFieldLimits.text),
  description: z.string().trim().max(smsPatternFieldLimits.description).optional(),
  shared: z.boolean(),
  website: z.string().trim().min(1).max(smsPatternFieldLimits.website),
  category: patternCategorySchema,
  vars: z.array(smsPatternVariableSchema).min(1).max(smsPatternFieldLimits.variableCount),
});
export type SmsPatternInput = z.infer<typeof smsPatternInputSchema>;

export type SmsPattern = { code: string; text: string; description: string | null; status: string | null; website: string | null; shared: boolean; category: number | null; vars: { var: string; length: number; type: string }[] };
