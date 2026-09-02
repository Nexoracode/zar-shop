import { z } from "zod";

/** See `authFieldLimits`: one number per field, shared by the form control and the schema. */
export const colorFieldLimits = { name: 100, hex: 7 } as const;

const colorFields = {
  name: z.string().trim().min(2, "نام رنگ باید حداقل ۲ نویسه باشد.").max(colorFieldLimits.name, `نام رنگ نباید بیشتر از ${colorFieldLimits.name} نویسه باشد.`),
  hex: z.string().trim().toUpperCase().regex(/^#[0-9A-F]{6}$/, "کد رنگ باید مانند #C9A56A باشد."),
  isActive: z.boolean(),
  sortOrder: z.coerce.number("ترتیب نمایش را وارد کنید.").int("ترتیب نمایش باید عدد صحیح باشد.").min(0, "ترتیب نمایش نمی‌تواند منفی باشد.").max(9999, "ترتیب نمایش نمی‌تواند بیشتر از ۹۹۹۹ باشد."),
};

export const colorSchema = z.object({
  ...colorFields,
  isActive: colorFields.isActive.default(true),
  sortOrder: colorFields.sortOrder.default(0),
});

// A PATCH updates only the fields it sends, so the update schema carries no
// defaults: a sort-order-only reorder must not reset `isActive`.
export const updateColorSchema = z.object(colorFields).partial();
