import { z } from "zod";

const productOptionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  values: z.array(z.string().trim().min(1).max(80)).min(1).max(50).refine((values) => new Set(values).size === values.length, "مقدار تکراری در یک تنوع مجاز نیست."),
});

export const productSchema = z.object({
  sku: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(191),
  slug: z.string().trim().min(2).max(191).regex(/^[a-z0-9-]+$/),
  description: z.string().max(10000).optional(),
  categoryId: z.string().cuid().nullable().optional(),
  purity: z.coerce.number().int().min(1).max(999).default(750),
  weightGrams: z.coerce.number().positive().max(100000),
  makingFeeType: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  makingFeeValue: z.coerce.number().nonnegative(),
  profitPercent: z.coerce.number().min(0).max(100),
  taxPercent: z.coerce.number().min(0).max(100),
  stock: z.coerce.number().int().nonnegative(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  featured: z.boolean().default(false),
  mediaIds: z.array(z.string().cuid()).max(20).refine((ids) => new Set(ids).size === ids.length, "رسانه تکراری مجاز نیست.").default([]),
  options: z.array(productOptionSchema).max(10).refine((options) => new Set(options.map((option) => option.name)).size === options.length, "عنوان تنوع تکراری مجاز نیست.").default([]),
  optionGuideId: z.string().cuid().nullable().default(null),
});
