import { AdminPageHeader } from "@/components/admin-ui";
import { CategoryAttributePicker } from "@/components/category-attribute-picker";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { parseCategoryAttributeSchema } from "@/modules/products/attributes";

export default async function CategoryAttributesPage() {
  await requirePermission("catalog:manage");
  const categories = await db.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      attributeSchema: true,
      parent: { select: { name: true } },
      _count: { select: { products: true } },
    },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="تنوع و ویژگی‌ها"
        title="ویژگی‌های دسته‌بندی"
        description="ابتدا دسته‌بندی را پیدا کنید و سپس گروه‌ها و ویژگی‌های مخصوص محصولات همان دسته را مدیریت کنید."
      />
      <CategoryAttributePicker categories={categories.map((category) => {
        const groups = parseCategoryAttributeSchema(category.attributeSchema);
        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          isActive: category.isActive,
          parentName: category.parent?.name ?? null,
          productCount: category._count.products,
          groupCount: groups.length,
          attributeCount: groups.reduce((total, group) => total + group.attributes.length, 0),
        };
      })} />
    </>
  );
}
