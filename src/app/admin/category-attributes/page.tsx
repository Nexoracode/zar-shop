import { BlueprintCategoryAttributesManager } from "@/components/admin/blueprint/category-attributes-manager";
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
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

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

  return <BlueprintCategoryAttributesManager categories={rows} />;
}
