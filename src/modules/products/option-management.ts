import { db } from "@/lib/db";
import { optionEntries, optionSelectionKey, parseOptionValues } from "@/modules/products/options";

export async function getProductOptionManagement(productId: string) {
  const [product, colors, orderItems] = await Promise.all([
    db.product.findUnique({ where: { id: productId }, select: { id: true, name: true, sku: true, stock: true, storeIndustry: true, options: { orderBy: { position: "asc" } } } }),
    db.color.findMany({ where: { isActive: true }, select: { id: true, name: true, hex: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.orderItem.findMany({ where: { productId }, select: { selectedOptions: true } }),
  ]);
  if (!product) return null;

  const usedSelectionKeys = new Set(orderItems.flatMap((item) => optionEntries(item.selectedOptions).map(([name, value]) => optionSelectionKey(name, value))));
  return {
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    productStock: product.stock,
    storeIndustry: product.storeIndustry,
    colors,
    initialOptions: product.options.map((option) => ({
      name: option.name,
      type: option.type,
      values: parseOptionValues(option.values).map((item) => ({
        ...item,
        stock: item.stock ?? product.stock,
        used: usedSelectionKeys.has(optionSelectionKey(option.name, item.value)),
      })),
    })),
  };
}
