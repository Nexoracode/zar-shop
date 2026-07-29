import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-ui";
import { ProductOptionsForm } from "@/components/product-options-form";
import { requirePermission } from "@/modules/auth/session";
import { getProductOptionManagement } from "@/modules/products/option-management";

type Context = { params: Promise<{ id: string }> };

export default async function ProductOptionsPage({ params }: Context) {
  await requirePermission("catalog:manage");
  const { id } = await params;
  const data = await getProductOptionManagement(id);
  if (!data) notFound();

  return <>
    <AdminPageHeader eyebrow={`محصول ${data.productSku}`} title={`مدیریت تنوع «${data.productName}»`} description="رنگ، سایز و سایر گزینه‌های قابل انتخاب این محصول را در این صفحه مدیریت کنید." />
    <ProductOptionsForm productId={data.productId} productStock={data.productStock} storeIndustry={data.storeIndustry} colors={data.colors} initialOptions={data.initialOptions} />
  </>;
}
