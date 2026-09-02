import { AdminPageHeader } from "@/components/admin-ui";
import { ProductAttributeProductPicker } from "@/components/product-attribute-product-picker";
import { BlueprintProductAttributesManager } from "@/components/admin/blueprint/product-attributes-manager";
import { requirePermission } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";

export default async function ProductAttributesIndexPage() {
  await requirePermission("catalog:manage");
  const brandSettings = await getBrandSettings();
  if (brandSettings.adminTemplate === "BLUEPRINT") return <BlueprintProductAttributesManager />;

  return <>
    <AdminPageHeader eyebrow="مدیریت کاتالوگ" title="ویژگی‌های محصولات" description="ابتدا محصول را جستجو و انتخاب کنید؛ سپس ویژگی‌های وابسته به دسته‌بندی آن را در همان صفحه مدیریت کنید." />
    <ProductAttributeProductPicker />
  </>;
}
