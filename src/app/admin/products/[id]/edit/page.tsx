import { notFound } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { BlueprintProductForm } from "@/components/admin/blueprint/product-form";
import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";
import { parseOptionValues } from "@/modules/products/options";
import { parseCategoryAttributeSchema, parseProductAttributes } from "@/modules/products/attributes";
import { getBrandSettings } from "@/modules/settings/brand-settings";

type Context = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Context) {
  await requirePermission("catalog:manage");
  const { id } = await params;
  const [product, categories, brandSettings] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { media: { include: { media: true }, orderBy: { position: "asc" } }, options: { orderBy: { position: "asc" } }, optionGuide: true },
    }),
    db.category.findMany({
      where: { isActive: true },
      include: { parent: { select: { name: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    getBrandSettings(),
  ]);
  if (!product) notFound();
  const Form = brandSettings.adminTemplate === "BLUEPRINT" ? BlueprintProductForm : ProductForm;

  return (
    <>
      <AdminPageHeader title={`ویرایش «${product.name}»`} description="اطلاعات، قیمت‌گذاری، موجودی و گالری این محصول را به‌روزرسانی کنید." backHref="/admin/products" backLabel="بازگشت به محصولات" />
      <Form
        storeIndustry={product.storeIndustry}
        categories={categories.map((category) => ({ id: category.id, name: category.name, parentName: category.parent?.name ?? null, attributeGroups: parseCategoryAttributeSchema(category.attributeSchema) }))}
        product={{
          id: product.id,
          sku: product.sku,
          name: product.name,
          slug: product.slug,
          description: product.description ?? "",
          categoryId: product.categoryId ?? "",
          storeIndustry: product.storeIndustry,
          purity: product.purity,
          weightGrams: Number(product.weightGrams),
          makingFeeType: product.makingFeeType,
          makingFeeValue: Number(product.makingFeeValue),
          profitPercent: Number(product.profitPercent),
          taxPercent: Number(product.taxPercent),
          fixedPrice: product.fixedPrice === null ? null : Number(product.fixedPrice),
          discountType: product.discountType,
          discountValue: product.discountValue === null ? null : Number(product.discountValue),
          // Both templates now take the discount window as an instant, so the hour survives.
          discountStartsAt: product.discountStartsAt?.toISOString() ?? null,
          discountEndsAt: product.discountEndsAt?.toISOString() ?? null,
          stock: product.stock,
          preparationDays: product.preparationDays,
          status: product.status,
          featured: product.featured,
          attributes: parseProductAttributes(product.attributes),
          options: product.options.map((option) => ({ name: option.name, values: parseOptionValues(option.values) })),
          optionGuide: product.optionGuide ? { id: product.optionGuide.id, title: product.optionGuide.title ?? product.optionGuide.storageKey, url: product.optionGuide.url, type: product.optionGuide.type } : null,
          media: product.media.map(({ media }) => ({ id: media.id, title: media.title ?? media.storageKey, url: media.url, type: media.type })),
        }}
      />
    </>
  );
}
