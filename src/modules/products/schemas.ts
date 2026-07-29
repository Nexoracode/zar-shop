import { z } from "zod";

const productOptionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  values: z.array(z.object({
    value: z.string().trim().min(1).max(80),
    colorId: z.string().cuid().nullable().default(null),
    isActive: z.boolean().default(true),
    stock: z.coerce.number().int().nonnegative().nullable().default(null),
    weightGrams: z.string().trim().regex(/^\d{1,7}(\.\d{1,3})?$/, "وزن تنوع باید حداکثر سه رقم اعشار داشته باشد.").nullable().default(null),
    price: z.string().trim().regex(/^[1-9]\d{0,17}$/, "قیمت تنوع باید یک مبلغ معتبر و بیشتر از صفر باشد.").nullable().default(null),
  })).min(1).max(50).refine((values) => new Set(values.map((item) => item.value)).size === values.length, "مقدار تکراری در یک تنوع مجاز نیست."),
}).superRefine((option, context) => {
  if (option.name.includes("رنگ") && option.values.some((item) => !item.colorId)) {
    context.addIssue({ code: "custom", path: ["values"], message: "برای هر مقدارِ تنوع رنگ، خود رنگ را نیز انتخاب کنید." });
  }
});

export const productSchema = z.object({
  sku: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(191),
  slug: z.string().trim().min(2).max(191).regex(/^[a-z0-9-]+$/),
  description: z.string().max(200000).optional(),
  categoryId: z.string().cuid().nullable().optional(),
  storeIndustry: z.enum(["GOLD", "GENERAL"]).default("GOLD"),
  purity: z.coerce.number().int().min(1).max(999).default(750),
  weightGrams: z.coerce.number().nonnegative().max(100000),
  makingFeeType: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  makingFeeValue: z.coerce.number().nonnegative(),
  profitPercent: z.coerce.number().min(0).max(100),
  taxPercent: z.coerce.number().min(0).max(100),
  fixedPrice: z.coerce.number().positive().max(999999999999999999).nullable().default(null),
  stock: z.coerce.number().int().nonnegative(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  featured: z.boolean().default(false),
  mediaIds: z.array(z.string().cuid()).max(20).refine((ids) => new Set(ids).size === ids.length, "رسانه تکراری مجاز نیست.").default([]),
  options: z.array(productOptionSchema).max(10).refine((options) => new Set(options.map((option) => option.name)).size === options.length, "عنوان تنوع تکراری مجاز نیست.").superRefine((options, context) => {
    if (options.filter((option) => option.values.some((item) => item.weightGrams !== null)).length > 1) {
      context.addIssue({ code: "custom", message: "وزن فقط در یک گروه تنوع، مانند سایز، قابل تعریف است." });
    }
    if (options.filter((option) => option.values.some((item) => item.price !== null)).length > 1) {
      context.addIssue({ code: "custom", message: "قیمت مستقیم فقط در یک گروه تنوع قابل تعریف است." });
    }
  }).default([]),
  optionGuideId: z.string().cuid().nullable().default(null),
});

export const completeProductSchema = productSchema.superRefine((product, context) => {
  if (product.storeIndustry === "GOLD" && product.weightGrams <= 0) {
    context.addIssue({ code: "custom", path: ["weightGrams"], message: "وزن محصول طلا باید بیشتر از صفر باشد." });
  }
  if (product.storeIndustry === "GENERAL" && product.fixedPrice === null) {
    context.addIssue({ code: "custom", path: ["fixedPrice"], message: "قیمت محصول را وارد کنید." });
  }
  if (product.storeIndustry === "GOLD" && product.options.some((option) => option.values.some((item) => item.price !== null))) {
    context.addIssue({ code: "custom", path: ["options"], message: "برای محصول طلا، قیمت تنوع از وزن آن محاسبه می‌شود." });
  }
  if (product.storeIndustry === "GENERAL" && product.options.some((option) => option.values.some((item) => item.weightGrams !== null))) {
    context.addIssue({ code: "custom", path: ["options"], message: "برای محصول معمولی، به‌جای وزن می‌توانید قیمت مستقیم تنوع را وارد کنید." });
  }
});
