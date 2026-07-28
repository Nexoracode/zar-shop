import { z } from "zod";

export const colorSchema = z.object({
  name: z.string().trim().min(2).max(100),
  hex: z.string().trim().toUpperCase().regex(/^#[0-9A-F]{6}$/, "کد رنگ باید مانند #C9A56A باشد."),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const updateColorSchema = colorSchema.partial();
