import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-ui";
import { ProductAttributesForm } from "@/components/product-attributes-form";
import { BlueprintProductAttributesForm } from "@/components/admin/blueprint/product-attributes-form";
import { requirePermission } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { getProductAttributeManagement } from "@/modules/products/attribute-management";

type Context = { params: Promise<{ id: string }> };

export default async function ProductAttributesPage({ params }: Context) {
  await requirePermission("catalog:manage");
  const { id } = await params;
  const [data, brandSettings] = await Promise.all([getProductAttributeManagement(id), getBrandSettings()]);
  if (!data) notFound();

  if (brandSettings.adminTemplate === "BLUEPRINT") {
    return <BlueprintProductAttributesForm
      productId={data.productId}
      productName={data.productName}
      productSku={data.productSku}
      categoryId={data.categoryId}
      categoryName={data.categoryName}
      initialGroups={data.groups}
      initialAttributes={data.initialAttributes}
    />;
  }

  return <>
    <AdminPageHeader eyebrow={`محصول ${data.productSku}`} title={`ویژگی‌های «${data.productName}»`} description="مقادیر توصیفی این محصول را براساس ساختار ویژگی‌های دسته‌بندی تکمیل کنید." backHref={`/admin/products/${data.productId}/edit`} backLabel="بازگشت به فرم محصول" />
    <ProductAttributesForm productId={data.productId} categoryId={data.categoryId} categoryName={data.categoryName} groups={data.groups} initialAttributes={data.initialAttributes} />
  </>;
}
