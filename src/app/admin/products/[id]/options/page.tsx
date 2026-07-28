import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-ui";
import { ProductOptionsForm } from "@/components/product-options-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { parseOptionValues } from "@/modules/products/options";

type Context = { params: Promise<{ id: string }> };

export default async function ProductOptionsPage({ params }: Context) {
  await requirePermission("catalog:manage");
  const { id } = await params;
  const [product, colors] = await Promise.all([
    db.product.findUnique({ where: { id }, select: { id: true, name: true, sku: true, options: { orderBy: { position: "asc" } } } }),
    db.color.findMany({ where: { isActive: true }, select: { id: true, name: true, hex: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  if (!product) notFound();

  return <>
    <AdminPageHeader eyebrow={`محصول ${product.sku}`} title={`مدیریت تنوع «${product.name}»`} description="رنگ، سایز و سایر گزینه‌های قابل انتخاب این محصول را در این صفحه مدیریت کنید." />
    <ProductOptionsForm productId={product.id} colors={colors} initialOptions={product.options.map((option) => ({ name: option.name, values: parseOptionValues(option.values) }))} />
  </>;
}
