import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-ui";
import { CategoryAttributesForm } from "@/components/category-attributes-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { parseCategoryAttributeSchema } from "@/modules/products/attributes";

type Context = { params: Promise<{ id: string }> };

export default async function CategoryAttributesPage({ params }: Context) {
  await requirePermission("catalog:manage");
  const { id } = await params;
  const category = await db.category.findUnique({ where: { id }, select: { id: true, name: true, attributeSchema: true } });
  if (!category) notFound();
  return <>
    <AdminPageHeader eyebrow="ساختار فروشگاه" title={`ویژگی‌های «${category.name}»`} description="گروه‌ها و ویژگی‌هایی را تعریف کنید که فقط برای محصولات همین دسته‌بندی قابل تکمیل باشند." backHref="/admin/categories" backLabel="بازگشت به دسته‌بندی‌ها" />
    <CategoryAttributesForm categoryId={category.id} initialGroups={parseCategoryAttributeSchema(category.attributeSchema)} />
  </>;
}
