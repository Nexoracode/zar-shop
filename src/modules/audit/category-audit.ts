export type CategoryAuditSnapshot = {
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  imageId: string | null;
  isActive: boolean;
  featured: boolean;
  sortOrder: number;
};

const fieldLabels: Record<keyof CategoryAuditSnapshot, string> = {
  name: "نام دسته‌بندی",
  slug: "نشانی دسته‌بندی",
  description: "توضیحات",
  parentId: "شناسه دسته والد",
  imageId: "شناسه تصویر شاخص",
  isActive: "وضعیت فعالیت",
  featured: "نمایش در دسته‌های ویژه",
  sortOrder: "ترتیب نمایش",
};

const fields = Object.keys(fieldLabels) as Array<keyof CategoryAuditSnapshot>;

export function categoryAuditSnapshot(category: CategoryAuditSnapshot): CategoryAuditSnapshot {
  return Object.fromEntries(fields.map((field) => [field, category[field]])) as CategoryAuditSnapshot;
}

export function buildCategoryAuditChanges(before: CategoryAuditSnapshot, after: CategoryAuditSnapshot) {
  return fields.flatMap((field) => before[field] === after[field] ? [] : [{
    path: field,
    label: fieldLabels[field],
    before: before[field],
    after: after[field],
  }]);
}
