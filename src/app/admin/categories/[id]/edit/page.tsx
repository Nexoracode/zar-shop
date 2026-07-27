import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/category-form";
import { AdminPageHeader } from "@/components/admin-ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

type Context = { params: Promise<{ id: string }> };

export default async function EditCategoryPage({ params }: Context) {
  await requirePermission("catalog:manage");
  const { id } = await params;
  const [category, categories] = await Promise.all([
    db.category.findUnique({ where: { id }, include: { image: true } }),
    db.category.findMany({ include: { parent: { select: { name: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  if (!category) notFound();
  return <><AdminPageHeader eyebrow="ساختار فروشگاه" title={`ویرایش «${category.name}»`} description="اطلاعات، جایگاه و تصویر شاخص این دسته را به‌روزرسانی کنید." /><CategoryForm categories={categories.map((item) => ({ id: item.id, name: item.name, parentName: item.parent?.name ?? null }))} category={{ id: category.id, name: category.name, slug: category.slug, description: category.description ?? "", parentId: category.parentId ?? "", image: category.image ? { id: category.image.id, title: category.image.title ?? category.name, url: category.image.url, type: category.image.type } : null, sortOrder: category.sortOrder, isActive: category.isActive, featured: category.featured }} /></>;
}
