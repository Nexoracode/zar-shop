import { z } from "zod";

/*
 * The shared library of variant types and their values — «رنگ» with مشکی و سفید, «سایز» with
 * M/L/XL. A product picks from here rather than retyping the same words on every form, which is
 * what makes «مشکی» on one product the same «مشکی» on the next.
 */

/** See `authFieldLimits`: one number per field, shared by the form control and the schema. */
export const optionFieldLimits = { typeName: 80, valueLabel: 80 } as const;

export const optionValueSchema = z.object({
  id: z.string().cuid().optional(),
  label: z.string().trim().min(1, "عنوان مقدار را وارد کنید.").max(optionFieldLimits.valueLabel, "عنوان مقدار نباید بیشتر از ۸۰ نویسه باشد."),
  colorId: z.string().cuid("رنگ انتخاب‌شده معتبر نیست.").nullable().default(null),
  isActive: z.boolean().default(true),
});

export const optionTypeSchema = z.object({
  name: z.string().trim().min(1, "نام نوع تنوع را وارد کنید.").max(optionFieldLimits.typeName, "نام نوع تنوع نباید بیشتر از ۸۰ نویسه باشد."),
  kind: z.enum(["SELECT", "COLOR"]).default("SELECT"),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  values: z.array(optionValueSchema)
    .max(200, "حداکثر ۲۰۰ مقدار برای هر نوع تنوع مجاز است.")
    .refine((values) => new Set(values.map((value) => value.label)).size === values.length, "مقدار تکراری در یک نوع تنوع مجاز نیست.")
    .default([]),
}).superRefine((type, context) => {
  // A colour type's values point at the colour library, so the swatch is defined in one place.
  if (type.kind === "COLOR" && type.values.some((value) => !value.colorId)) {
    context.addIssue({ code: "custom", path: ["values"], message: "برای هر مقدارِ نوع رنگ، خود رنگ را نیز انتخاب کنید." });
  }
});

export const updateOptionTypeSchema = optionTypeSchema;

/** Adding a single value from inside the product form, without opening the library page. */
export const quickOptionValueSchema = z.object({
  typeId: z.string().cuid("نوع تنوع انتخاب‌شده معتبر نیست."),
  label: z.string().trim().min(1, "عنوان مقدار را وارد کنید.").max(optionFieldLimits.valueLabel, "عنوان مقدار نباید بیشتر از ۸۰ نویسه باشد."),
  colorId: z.string().cuid("رنگ انتخاب‌شده معتبر نیست.").nullable().default(null),
});

export type OptionTypeInput = z.infer<typeof optionTypeSchema>;
