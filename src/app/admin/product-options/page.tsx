import { AdminPageHeader } from "@/components/admin-ui";
import { ProductOptionProductPicker } from "@/components/product-option-product-picker";
import { requirePermission } from "@/modules/auth/session";

export default async function ProductOptionsIndexPage() {
  await requirePermission("catalog:manage");

  return (
    <>
      <AdminPageHeader
        eyebrow="مدیریت کاتالوگ"
        title="تنوع محصولات"
        description="ابتدا محصول را پیدا کنید و سپس رنگ، سایز، موجودی، وزن یا قیمت تنوع‌های آن را مدیریت کنید."
      />
      <ProductOptionProductPicker />
    </>
  );
}
