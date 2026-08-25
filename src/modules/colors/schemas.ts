import { z } from "zod";

/** See `authFieldLimits`: one number per field, shared by the form control and the schema. */
export const colorFieldLimits = { name: 100, hex: 7 } as const;

export const colorSchema = z.object({
  name: z.string().trim().min(2).max(colorFieldLimits.name),
  hex: z.string().trim().toUpperCase().regex(/^#[0-9A-F]{6}$/, "کد رنگ باید مانند #C9A56A باشد."),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const updateColorSchema = colorSchema.partial();
