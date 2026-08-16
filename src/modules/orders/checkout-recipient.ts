import { z } from "zod";

import { normalizeNumericValue } from "@/lib/persian-numbers";

export const checkoutRecipientSchema = z.object({
  recipientType: z.enum(["SELF", "OTHER"]),
  recipient: z.string().trim().min(3).max(150),
  recipientPhone: z.string().transform((value) => normalizeNumericValue(value, false)).pipe(z.string().regex(/^09\d{9}$/)),
});
