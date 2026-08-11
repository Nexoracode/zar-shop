import { AdminPageHeader } from "@/components/admin-ui";
import { ProductAttributeProductPicker } from "@/components/product-attribute-product-picker";
import { requirePermission } from "@/modules/auth/session";

export default async function ProductAttributesIndexPage() {
  await requirePermission("catalog:manage");
  return <>
    <AdminPageHeader eyebrow="مدیریت کاتالوگ" title="ویژگی‌های محصولات" description="ابتدا محصول را جستجو و انتخاب کنید؛ سپس ویژگی‌های وابسته به دسته‌بندی آن را در همان صفحه مدیریت کنید." />
    <ProductAttributeProductPicker />
  </>;
}
