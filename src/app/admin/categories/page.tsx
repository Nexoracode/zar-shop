import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { BlueprintCategoriesView } from "@/components/admin/blueprint/categories-view";

export default async function CategoriesPage() {
  await requirePermission("catalog:manage");
  const categories = await db.category.findMany({
    include: { image: { select: { id: true, url: true, alt: true } }, parent: { select: { name: true } }, _count: { select: { products: true, children: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return <BlueprintCategoriesView categories={categories.map((category) => ({
    id: category.id, name: category.name, slug: category.slug, description: category.description,
    parentId: category.parentId, parentName: category.parent?.name ?? null,
    isActive: category.isActive, featured: category.featured, sortOrder: category.sortOrder,
    image: category.image, _count: category._count,
  }))} />;
}
