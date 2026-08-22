import { z } from "zod";

const stableIdSchema = z.string().trim().min(8).max(80).regex(/^[a-zA-Z0-9_-]+$/);

export const categoryAttributeDefinitionSchema = z.object({
  id: stableIdSchema,
  name: z.string().trim().min(2).max(100),
  important: z.boolean().default(false),
  // Defaults to true so existing category attribute data (saved before this field existed)
  // keeps behaving exactly as before — every attribute stays a storefront filter until an
  // admin deliberately opts one out, instead of the filter sidebar going blank on upgrade.
  filterable: z.boolean().default(true),
});

export const categoryAttributeGroupSchema = z.object({
  id: stableIdSchema,
  name: z.string().trim().min(2).max(100),
  attributes: z.array(categoryAttributeDefinitionSchema).min(1).max(30).refine(
    (attributes) => new Set(attributes.map((attribute) => attribute.id)).size === attributes.length,
    "شناسه ویژگی‌ها نباید تکراری باشد.",
  ).refine(
    (attributes) => new Set(attributes.map((attribute) => attribute.name)).size === attributes.length,
    "نام ویژگی‌ها در یک گروه نباید تکراری باشد.",
  ),
});

export const categoryAttributeSchema = z.array(categoryAttributeGroupSchema).max(20).refine(
  (groups) => new Set(groups.map((group) => group.id)).size === groups.length,
  "شناسه گروه‌های ویژگی نباید تکراری باشد.",
).refine(
  (groups) => new Set(groups.map((group) => group.name)).size === groups.length,
  "نام گروه‌های ویژگی نباید تکراری باشد.",
).refine(
  (groups) => {
    const ids = groups.flatMap((group) => group.attributes.map((attribute) => attribute.id));
    return new Set(ids).size === ids.length;
  },
  "هر ویژگی باید شناسه یکتای خودش را داشته باشد.",
);

export const productAttributeValueSchema = z.object({
  attributeId: stableIdSchema,
  values: z.array(z.string().trim().min(1).max(2000)).min(1).max(20).refine(
    (values) => new Set(values).size === values.length,
    "مقدار تکراری برای یک ویژگی مجاز نیست.",
  ),
});

export const productAttributesSchema = z.array(productAttributeValueSchema).max(200).refine(
  (items) => new Set(items.map((item) => item.attributeId)).size === items.length,
  "هر ویژگی فقط یک‌بار قابل ثبت است.",
);

export type CategoryAttributeGroup = z.infer<typeof categoryAttributeGroupSchema>;
export type ProductAttributeValue = z.infer<typeof productAttributeValueSchema>;

export function parseCategoryAttributeSchema(value: unknown): CategoryAttributeGroup[] {
  const parsed = categoryAttributeSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function parseProductAttributes(value: unknown): ProductAttributeValue[] {
  const parsed = productAttributesSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function validateProductAttributes(definitionsValue: unknown, attributesValue: unknown) {
  const definitions = parseCategoryAttributeSchema(definitionsValue);
  const parsed = productAttributesSchema.safeParse(attributesValue);
  if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0]?.message ?? "ویژگی‌های محصول معتبر نیستند." };
  const definitionsById = new Map(definitions.flatMap((group) => group.attributes.map((attribute) => [attribute.id, attribute] as const)));
  for (const item of parsed.data) {
    const definition = definitionsById.get(item.attributeId);
    if (!definition) return { ok: false as const, message: "یکی از ویژگی‌ها متعلق به دسته‌بندی انتخاب‌شده نیست." };
  }
  return { ok: true as const, data: parsed.data };
}

export function buildProductAttributeGroups(definitionsValue: unknown, attributesValue: unknown) {
  const definitions = parseCategoryAttributeSchema(definitionsValue);
  const valuesById = new Map(parseProductAttributes(attributesValue).map((item) => [item.attributeId, item.values]));
  return definitions.flatMap((group) => {
    const attributes = group.attributes.flatMap((attribute) => {
      const values = valuesById.get(attribute.id) ?? [];
      return values.length ? [{ id: attribute.id, name: attribute.name, values, ...(attribute.important ? { important: true } : {}) }] : [];
    });
    return attributes.length ? [{ id: group.id, name: group.name, attributes }] : [];
  });
}
