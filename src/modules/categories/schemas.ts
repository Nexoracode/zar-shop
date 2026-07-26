import { z } from "zod";

const optionalCuid = z.string().cuid().nullable().optional();

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(2000).nullable().optional(),
  parentId: optionalCuid,
  imageId: optionalCuid,
  isActive: z.boolean().default(true),
  featured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(-10000).max(10000).default(0),
});

export const updateCategorySchema = categorySchema.partial();
