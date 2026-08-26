import { AdminPageHeader } from "@/components/admin-ui";
import { OptionTypeForm } from "@/components/option-type-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

export default async function NewOptionTypePage() {
  await requirePermission("catalog:manage");
  const colors = await db.color.findMany({ where: { isActive: true }, select: { id: true, name: true, hex: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return <>
    <AdminPageHeader eyebrow="مدیریت کاتالوگ" title="ثبت نوع تنوع جدید" description="نام نوع و مقادیر آن را تعریف کنید؛ همین مقادیر در فرم محصول قابل انتخاب می‌شوند." backHref="/admin/option-types" backLabel="بازگشت به انواع تنوع" />
    <OptionTypeForm colors={colors} />
  </>;
}
