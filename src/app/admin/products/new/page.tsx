import { ProductForm } from "@/components/product-form";
import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";

export default async function NewProduct() {
  await requirePermission("catalog:manage");
  const categories = await db.category.findMany({ where: { isActive: true }, include: { parent: { select: { name: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return (
    <>
      <AdminPageHeader eyebrow="مدیریت کاتالوگ" title="ثبت محصول جدید" description="اطلاعات فنی، قیمت‌گذاری، موجودی و تصاویر محصول را تکمیل کنید." />
      <ProductForm storeIndustry="GOLD" categories={categories.map((category) => ({ id: category.id, name: category.name, parentName: category.parent?.name ?? null }))} />
    </>
  );
}
