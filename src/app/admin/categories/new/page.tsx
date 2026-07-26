import { CategoryForm } from "@/components/category-form";
import { AdminPageHeader } from "@/components/admin-ui";
import { db } from "@/lib/db";

export default async function NewCategoryPage() {
  const categories = await db.category.findMany({ include: { parent: { select: { name: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return <><AdminPageHeader eyebrow="ساختار فروشگاه" title="ثبت دسته‌بندی جدید" description="اطلاعات، جایگاه در ساختار و تصویر شاخص دسته را تکمیل کنید." /><CategoryForm categories={categories.map((item) => ({ id: item.id, name: item.name, parentName: item.parent?.name ?? null }))} /></>;
}
