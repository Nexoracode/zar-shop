import { z } from "zod";

/** One number per field, shared by the form control and the schema — see `categoryFieldLimits`. */
export const brandFieldLimits = { name: 100, slug: 120 } as const;

const optionalCuid = z.string().cuid().nullable().optional();

const brandFields = {
  name: z.string().trim().min(2).max(brandFieldLimits.name),
  slug: z.string().trim().min(2).max(brandFieldLimits.slug).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  logoId: optionalCuid,
  isActive: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.coerce.number().int().min(-10000).max(10000),
};

export const brandSchema = z.object({
  ...brandFields,
  isActive: brandFields.isActive.default(true),
  featured: brandFields.featured.default(false),
  sortOrder: brandFields.sortOrder.default(0),
});

// A PATCH updates only the fields it sends, so the update schema carries no
// defaults: an absent key stays absent instead of overwriting the column with
// a default (e.g. a sort-order-only reorder must not reset `featured`).
export const updateBrandSchema = z.object(brandFields).partial();
