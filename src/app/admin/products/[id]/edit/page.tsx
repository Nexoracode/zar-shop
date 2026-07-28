import { notFound } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";

type Context = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Context) {
  await requirePermission("catalog:manage");
  const { id } = await params;
  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { media: { include: { media: true }, orderBy: { position: "asc" } }, sizes: { orderBy: { position: "asc" } }, sizeGuide: true },
    }),
    db.category.findMany({
      where: { isActive: true },
      include: { parent: { select: { name: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  if (!product) notFound();

  return (
    <>
      <AdminPageHeader eyebrow="مدیریت کاتالوگ" title={`ویرایش «${product.name}»`} description="اطلاعات، قیمت‌گذاری، موجودی و گالری این محصول را به‌روزرسانی کنید." />
      <ProductForm
        categories={categories.map((category) => ({ id: category.id, name: category.name, parentName: category.parent?.name ?? null }))}
        product={{
          id: product.id,
          sku: product.sku,
          name: product.name,
          slug: product.slug,
          description: product.description ?? "",
          categoryId: product.categoryId ?? "",
          purity: product.purity,
          weightGrams: Number(product.weightGrams),
          makingFeeType: product.makingFeeType,
          makingFeeValue: Number(product.makingFeeValue),
          profitPercent: Number(product.profitPercent),
          taxPercent: Number(product.taxPercent),
          stock: product.stock,
          status: product.status,
          featured: product.featured,
          sizes: product.sizes.map((size) => size.label),
          sizeGuide: product.sizeGuide ? { id: product.sizeGuide.id, title: product.sizeGuide.title ?? product.sizeGuide.storageKey, url: product.sizeGuide.url, type: product.sizeGuide.type } : null,
          media: product.media.map(({ media }) => ({ id: media.id, title: media.title ?? media.storageKey, url: media.url, type: media.type })),
        }}
      />
    </>
  );
}
