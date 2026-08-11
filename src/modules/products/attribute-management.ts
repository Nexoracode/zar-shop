import { db } from "@/lib/db";
import { parseCategoryAttributeSchema, parseProductAttributes } from "@/modules/products/attributes";

export async function getProductAttributeManagement(productId: string) {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      sku: true,
      category: { select: { id: true, name: true, attributeSchema: true } },
      attributes: true,
    },
  });
  if (!product) return null;

  return {
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    categoryId: product.category?.id ?? null,
    categoryName: product.category?.name ?? null,
    groups: parseCategoryAttributeSchema(product.category?.attributeSchema),
    initialAttributes: parseProductAttributes(product.attributes),
  };
}
