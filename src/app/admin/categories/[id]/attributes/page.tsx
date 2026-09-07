import { notFound } from "next/navigation";
import { BlueprintCategoryAttributesForm } from "@/components/admin/blueprint/category-attributes-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { parseCategoryAttributeSchema, parseProductAttributes } from "@/modules/products/attributes";

type Context = { params: Promise<{ id: string }> };

export default async function CategoryAttributesPage({ params }: Context) {
  await requirePermission("catalog:manage");
  const { id } = await params;
  const category = await db.category.findUnique({ where: { id }, select: { id: true, name: true, attributeSchema: true } });
  if (!category) notFound();
  const groups = parseCategoryAttributeSchema(category.attributeSchema);
  // Only needs the set of attribute ids that appear on this category's products, to warn before
  // deleting one that still holds data. A large-but-bounded sample catches every attribute a
  // category realistically uses without loading an unbounded number of JSON blobs.
  const products = await db.product.findMany({ where: { categoryId: id }, select: { attributes: true }, take: 2000 });
  const usedAttributeIds = [...new Set(products.flatMap((product) => parseProductAttributes(product.attributes).map((attribute) => attribute.attributeId)))];
  return <BlueprintCategoryAttributesForm categoryId={category.id} categoryName={category.name} initialGroups={groups} usedAttributeIds={usedAttributeIds} />;
}
