type ProductAuditSource = Record<string, unknown> & {
  category?: { id: string; name: string } | null;
  media?: Array<{ position: number; isCover: boolean; media: { id: string; title: string | null; storageKey: string } }>;
  options?: Array<{ id: string; name: string; values: unknown; position: number }>;
  optionGuide?: { id: string; title: string | null; storageKey: string } | null;
};

export type AuditChange = { path: string; label: string; before: unknown; after: unknown };

const productFieldLabels: Record<string, string> = {
  sku: "کد محصول (SKU)", name: "نام محصول", slug: "نشانی محصول", description: "توضیحات",
  status: "وضعیت انتشار", storeIndustry: "نوع فروشگاه", category: "دسته‌بندی", categoryId: "شناسه دسته‌بندی",
  optionGuide: "راهنمای انتخاب", optionGuideId: "شناسه راهنمای انتخاب", purity: "عیار", weightGrams: "وزن (گرم)",
  makingFeeType: "نوع اجرت", makingFeeValue: "مقدار اجرت", profitPercent: "درصد سود", taxPercent: "درصد مالیات",
  fixedPrice: "قیمت ثابت", discountType: "نوع تخفیف", discountValue: "مقدار تخفیف", discountStartsAt: "شروع تخفیف",
  discountEndsAt: "پایان تخفیف", stock: "موجودی", preparationDays: "زمان آماده‌سازی", featured: "محصول ویژه",
  attributes: "ویژگی‌ها", media: "گالری رسانه", options: "تنوع‌ها", id: "شناسه", title: "عنوان", storageKey: "کلید فایل",
  position: "جایگاه", isCover: "تصویر اصلی", values: "مقادیر", value: "مقدار", colorId: "شناسه رنگ", isActive: "فعال",
  price: "قیمت", productId: "شناسه محصول",
};

const productFields = [
  "sku", "name", "slug", "description", "status", "storeIndustry", "categoryId", "category", "optionGuideId", "optionGuide",
  "purity", "weightGrams", "makingFeeType", "makingFeeValue", "profitPercent", "taxPercent", "fixedPrice", "discountType",
  "discountValue", "discountStartsAt", "discountEndsAt", "stock", "preparationDays", "featured", "attributes", "media", "options",
] as const;

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    const maybeJson = value as { toJSON?: () => unknown };
    if (typeof maybeJson.toJSON === "function") return normalize(maybeJson.toJSON());
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  }
  return value ?? null;
}

export function productAuditSnapshot(product: ProductAuditSource) {
  const snapshotSource: Record<string, unknown> = {
    ...product,
    category: product.category ? { id: product.category.id, name: product.category.name } : null,
    optionGuide: product.optionGuide ? { id: product.optionGuide.id, title: product.optionGuide.title, storageKey: product.optionGuide.storageKey } : null,
    media: product.media?.map((item) => ({
      id: item.media.id,
      title: item.media.title,
      storageKey: item.media.storageKey,
      position: item.position,
      isCover: item.isCover,
    })) ?? [],
    options: product.options?.map((item) => ({ id: item.id, name: item.name, values: item.values, position: item.position })) ?? [],
  };
  return Object.fromEntries(productFields.map((field) => [field, normalize(snapshotSource[field])])) as Record<string, unknown>;
}

function same(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function pathLabel(path: Array<string | number>) {
  return path.map((part) => typeof part === "number" ? `ردیف ${part + 1}` : productFieldLabels[part] ?? part).join(" ← ");
}

export function buildAuditChanges(before: unknown, after: unknown, path: Array<string | number> = []): AuditChange[] {
  const previous = normalize(before);
  const next = normalize(after);
  if (same(previous, next)) return [];
  if (Array.isArray(previous) || Array.isArray(next)) {
    const previousItems = Array.isArray(previous) ? previous : [];
    const nextItems = Array.isArray(next) ? next : [];
    return Array.from({ length: Math.max(previousItems.length, nextItems.length) }, (_, index) =>
      buildAuditChanges(previousItems[index], nextItems[index], [...path, index])).flat();
  }
  if ((previous && typeof previous === "object") || (next && typeof next === "object")) {
    const previousObject = previous && typeof previous === "object" ? previous as Record<string, unknown> : {};
    const nextObject = next && typeof next === "object" ? next as Record<string, unknown> : {};
    return [...new Set([...Object.keys(previousObject), ...Object.keys(nextObject)])]
      .flatMap((key) => buildAuditChanges(previousObject[key], nextObject[key], [...path, key]));
  }
  const dottedPath = path.map(String).join(".");
  return [{ path: dottedPath, label: pathLabel(path), before: previous ?? null, after: next ?? null }];
}
