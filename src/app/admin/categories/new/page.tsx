import { redirect } from "next/navigation";
import { CategoryForm } from "@/components/category-form";
import { AdminPageHeader } from "@/components/admin-ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";

export default async function NewCategoryPage() {
  await requirePermission("catalog:manage");
  const brandSettings = await getBrandSettings();
  if (brandSettings.adminTemplate === "BLUEPRINT") redirect("/admin/categories");
  const categories = await db.category.findMany({ include: { parent: { select: { name: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return <><AdminPageHeader eyebrow="ساختار فروشگاه" title="ثبت دسته‌بندی جدید" description="اطلاعات، جایگاه در ساختار و تصویر شاخص دسته را تکمیل کنید." backHref="/admin/categories" backLabel="بازگشت به دسته‌بندی‌ها" /><CategoryForm categories={categories.map((item) => ({ id: item.id, name: item.name, parentName: item.parent?.name ?? null }))} /></>;
}
