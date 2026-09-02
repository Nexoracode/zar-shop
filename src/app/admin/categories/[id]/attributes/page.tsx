import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-ui";
import { CategoryAttributesForm } from "@/components/category-attributes-form";
import { BlueprintCategoryAttributesForm } from "@/components/admin/blueprint/category-attributes-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { parseCategoryAttributeSchema, parseProductAttributes } from "@/modules/products/attributes";

type Context = { params: Promise<{ id: string }> };

export default async function CategoryAttributesPage({ params }: Context) {
  await requirePermission("catalog:manage");
  const { id } = await params;
  const [category, brandSettings] = await Promise.all([
    db.category.findUnique({ where: { id }, select: { id: true, name: true, attributeSchema: true } }),
    getBrandSettings(),
  ]);
  if (!category) notFound();
  const groups = parseCategoryAttributeSchema(category.attributeSchema);

  if (brandSettings.adminTemplate === "BLUEPRINT") {
    const products = await db.product.findMany({ where: { categoryId: id }, select: { attributes: true } });
    const usedAttributeIds = [...new Set(products.flatMap((product) => parseProductAttributes(product.attributes).map((attribute) => attribute.attributeId)))];
    return <BlueprintCategoryAttributesForm categoryId={category.id} categoryName={category.name} initialGroups={groups} usedAttributeIds={usedAttributeIds} />;
  }

  return <>
    <AdminPageHeader eyebrow="ساختار فروشگاه" title={`ویژگی‌های «${category.name}»`} description="گروه‌ها و ویژگی‌هایی را تعریف کنید که فقط برای محصولات همین دسته‌بندی قابل تکمیل باشند." backHref="/admin/categories" backLabel="بازگشت به دسته‌بندی‌ها" />
    <CategoryAttributesForm categoryId={category.id} initialGroups={groups} />
  </>;
}
