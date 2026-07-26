import { notFound } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Context) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { media: { include: { media: true }, orderBy: { position: "asc" } } },
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
      <div className="mb-6">
        <h1 className="m-0 text-2xl sm:text-3xl">ویرایش محصول</h1>
        <span className="text-sm text-[#747982]">اطلاعات و گالری «{product.name}» را مدیریت کنید.</span>
      </div>
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
          media: product.media.map(({ media }) => ({ id: media.id, title: media.title ?? media.storageKey, url: media.url, type: media.type })),
        }}
      />
    </>
  );
}
