import { z } from "zod";

/** See `authFieldLimits`: one number per field, shared by the form control and the schema. */
export const categoryFieldLimits = { name: 100, slug: 120, description: 2000 } as const;

const optionalCuid = z.string().cuid().nullable().optional();

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(categoryFieldLimits.name),
  slug: z.string().trim().min(2).max(categoryFieldLimits.slug).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(categoryFieldLimits.description).nullable().optional(),
  parentId: optionalCuid,
  imageId: optionalCuid,
  isActive: z.boolean().default(true),
  featured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(-10000).max(10000).default(0),
});

export const updateCategorySchema = categorySchema.partial();
