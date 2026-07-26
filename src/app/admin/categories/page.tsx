import { CategoryManager } from "@/components/category-manager";
import { db } from "@/lib/db";

export default async function CategoriesPage() {
  const [categories, images] = await Promise.all([
    db.category.findMany({
      include: { image: true, parent: { select: { name: true } }, _count: { select: { products: true, children: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.mediaAsset.findMany({ where: { type: "IMAGE" }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  return (
    <>
      <div className="mb-6">
        <h1 className="m-0 text-2xl sm:text-3xl">دسته‌بندی‌ها</h1>
        <span className="text-sm text-[#747982]">مدیریت دسته‌های اصلی، زیردسته‌ها و تصویر شاخص صفحه اصلی</span>
      </div>
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
        images={images.map((image) => ({ id: image.id, title: image.title ?? image.storageKey, url: image.url }))}
      />
    </>
  );
}
