import { ProductForm } from "@/components/product-form";
import { BlueprintProductForm } from "@/components/admin/blueprint/product-form";
import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";
import { getStoreIndustry } from "@/modules/settings/store-settings";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { parseCategoryAttributeSchema } from "@/modules/products/attributes";
import { listSelectableOptionTypes } from "@/modules/options/option-library";

export default async function NewProduct() {
  await requirePermission("catalog:manage");
  const [categories, brands, colors, optionLibrary, storeIndustry, brandSettings] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, include: { parent: { select: { name: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.brand.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.color.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, hex: true } }),
    listSelectableOptionTypes(),
    getStoreIndustry(),
    getBrandSettings(),
  ]);
  const categoryOptions = categories.map((category) => ({ id: category.id, name: category.name, parentName: category.parent?.name ?? null, attributeGroups: parseCategoryAttributeSchema(category.attributeSchema) }));
  const optionLibraryOptions = optionLibrary.map((type) => ({ id: type.id, name: type.name, kind: type.kind, values: type.values.map((value) => ({ id: value.id, label: value.label, colorId: value.colorId, hex: value.color?.hex ?? null })) }));
  return (
    <>
      <AdminPageHeader title="ثبت محصول جدید" description="اطلاعات فنی، قیمت‌گذاری، موجودی و تصاویر محصول را تکمیل کنید." backHref="/admin/products" backLabel="بازگشت به محصولات" />
      {brandSettings.adminTemplate === "BLUEPRINT"
        ? <BlueprintProductForm storeIndustry={storeIndustry} categories={categoryOptions} brands={brands} colors={colors} optionLibrary={optionLibraryOptions} />
        : <ProductForm storeIndustry={storeIndustry} categories={categoryOptions} colors={colors} optionLibrary={optionLibraryOptions} />}
    </>
  );
}
