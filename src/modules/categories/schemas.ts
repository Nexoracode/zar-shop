import { z } from "zod";

/** See `authFieldLimits`: one number per field, shared by the form control and the schema. */
export const categoryFieldLimits = { name: 100, slug: 120, description: 2000 } as const;

const optionalCuid = z.string().cuid().nullable().optional();

const categoryFields = {
  name: z.string().trim().min(2).max(categoryFieldLimits.name),
  slug: z.string().trim().min(2).max(categoryFieldLimits.slug).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(categoryFieldLimits.description).nullable().optional(),
  parentId: optionalCuid,
  imageId: optionalCuid,
  isActive: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.coerce.number().int().min(-10000).max(10000),
};

export const categorySchema = z.object({
  ...categoryFields,
  isActive: categoryFields.isActive.default(true),
  featured: categoryFields.featured.default(false),
  sortOrder: categoryFields.sortOrder.default(0),
});

// A PATCH updates only the fields it sends, so the update schema carries no
// defaults: an absent key stays absent instead of overwriting the column with
// a default (e.g. a sort-order-only reorder must not reset `isActive`/`featured`).
export const updateCategorySchema = z.object(categoryFields).partial();
