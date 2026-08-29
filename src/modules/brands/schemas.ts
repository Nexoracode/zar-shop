import { z } from "zod";

/** One number per field, shared by the form control and the schema — see `categoryFieldLimits`. */
export const brandFieldLimits = { name: 100, slug: 120 } as const;

const optionalCuid = z.string().cuid().nullable().optional();

export const brandSchema = z.object({
  name: z.string().trim().min(2).max(brandFieldLimits.name),
  slug: z.string().trim().min(2).max(brandFieldLimits.slug).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  logoId: optionalCuid,
  isActive: z.boolean().default(true),
  featured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(-10000).max(10000).default(0),
});

export const updateBrandSchema = brandSchema.partial();
