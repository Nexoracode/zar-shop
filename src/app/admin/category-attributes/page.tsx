import { AdminPageHeader } from "@/components/admin-ui";
import { CategoryAttributePicker } from "@/components/category-attribute-picker";
import { BlueprintCategoryAttributesList } from "@/components/admin/blueprint/category-attributes-list";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { parseCategoryAttributeSchema } from "@/modules/products/attributes";

export default async function CategoryAttributesPage() {
  await requirePermission("catalog:manage");
  const [categories, brandSettings] = await Promise.all([
    db.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        attributeSchema: true,
        parent: { select: { name: true } },
        _count: { select: { products: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    getBrandSettings(),
  ]);

  const rows = categories.map((category) => {
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
  });

  if (brandSettings.adminTemplate === "BLUEPRINT") {
    return <BlueprintCategoryAttributesList categories={rows} />;
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="تنوع و ویژگی‌ها"
        title="ویژگی‌های دسته‌بندی"
        description="ابتدا دسته‌بندی را پیدا کنید و سپس گروه‌ها و ویژگی‌های مخصوص محصولات همان دسته را مدیریت کنید."
      />
      <CategoryAttributePicker categories={rows} />
    </>
  );
}
