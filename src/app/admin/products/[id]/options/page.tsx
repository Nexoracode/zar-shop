import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-ui";
import { ProductOptionsForm } from "@/components/product-options-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { optionEntries, optionSelectionKey, parseOptionValues } from "@/modules/products/options";

type Context = { params: Promise<{ id: string }> };

export default async function ProductOptionsPage({ params }: Context) {
  await requirePermission("catalog:manage");
  const { id } = await params;
  const [product, colors, orderItems] = await Promise.all([
    db.product.findUnique({ where: { id }, select: { id: true, name: true, sku: true, stock: true, options: { orderBy: { position: "asc" } } } }),
    db.color.findMany({ where: { isActive: true }, select: { id: true, name: true, hex: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.orderItem.findMany({ where: { productId: id }, select: { selectedOptions: true } }),
  ]);
  if (!product) notFound();
  const usedSelectionKeys = new Set(orderItems.flatMap((item) => optionEntries(item.selectedOptions).map(([name, value]) => optionSelectionKey(name, value))));

  return <>
    <AdminPageHeader eyebrow={`محصول ${product.sku}`} title={`مدیریت تنوع «${product.name}»`} description="رنگ، سایز و سایر گزینه‌های قابل انتخاب این محصول را در این صفحه مدیریت کنید." />
    <ProductOptionsForm productId={product.id} colors={colors} initialOptions={product.options.map((option) => ({ name: option.name, values: parseOptionValues(option.values).map((item) => ({ ...item, stock: item.stock ?? product.stock, used: usedSelectionKeys.has(optionSelectionKey(option.name, item.value)) })) }))} />
  </>;
}
