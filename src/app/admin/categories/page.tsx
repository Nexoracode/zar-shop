import { CategoryManager } from "@/components/category-manager";
import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin-ui";

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
      include: { image: true, parent: { select: { name: true } }, _count: { select: { products: true, children: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

  return (
    <>
      <AdminPageHeader eyebrow="ساختار فروشگاه" title="دسته‌بندی‌ها" description="دسته‌های اصلی، زیردسته‌ها، ترتیب نمایش و تصویر شاخص را مدیریت کنید." />
      <CategoryManager
        initialCategories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          parentId: category.parentId,
          parentName: category.parent?.name ?? null,
          imageId: category.imageId,
          imageUrl: category.image?.url ?? null,
          isActive: category.isActive,
          featured: category.featured,
          sortOrder: category.sortOrder,
          productsCount: category._count.products,
          childrenCount: category._count.children,
        }))}
      />
    </>
  );
}
