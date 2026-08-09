import { ProductForm } from "@/components/product-form";
import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";
import { getStoreIndustry } from "@/modules/settings/store-settings";
import { parseCategoryAttributeSchema } from "@/modules/products/attributes";

export default async function NewProduct() {
  await requirePermission("catalog:manage");
  const [categories, storeIndustry] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, include: { parent: { select: { name: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    getStoreIndustry(),
  ]);
  return (
    <>
      <AdminPageHeader eyebrow="مدیریت کاتالوگ" title="ثبت محصول جدید" description="اطلاعات فنی، قیمت‌گذاری، موجودی و تصاویر محصول را تکمیل کنید." backHref="/admin/products" backLabel="بازگشت به محصولات" />
      <ProductForm storeIndustry={storeIndustry} categories={categories.map((category) => ({ id: category.id, name: category.name, parentName: category.parent?.name ?? null, attributeGroups: parseCategoryAttributeSchema(category.attributeSchema) }))} />
    </>
  );
}
