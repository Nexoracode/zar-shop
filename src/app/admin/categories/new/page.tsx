import { CategoryForm } from "@/components/category-form";
import { AdminBackLink, AdminPageHeader } from "@/components/admin-ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

export default async function NewCategoryPage() {
  await requirePermission("catalog:manage");
  const categories = await db.category.findMany({ include: { parent: { select: { name: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return <><AdminPageHeader eyebrow="ساختار فروشگاه" title="ثبت دسته‌بندی جدید" description="اطلاعات، جایگاه در ساختار و تصویر شاخص دسته را تکمیل کنید." action={<AdminBackLink href="/admin/categories">بازگشت به دسته‌بندی‌ها</AdminBackLink>} /><CategoryForm categories={categories.map((item) => ({ id: item.id, name: item.name, parentName: item.parent?.name ?? null }))} /></>;
}
