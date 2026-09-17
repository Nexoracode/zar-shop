import { notFound } from "next/navigation";
import { BlueprintProductAttributesForm } from "@/components/admin/blueprint/product-attributes-form";
import { requirePermission } from "@/modules/auth/session";
import { getProductAttributeManagement } from "@/modules/products/attribute-management";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type Context = { params: Promise<{ id: string }> };

export default async function ProductAttributesPage({ params }: Context) {
  await requirePermission("catalog:manage");
  const { id } = await params;
  const data = await getProductAttributeManagement(id);
  if (!data) notFound();
  return <BlueprintProductAttributesForm
    productId={data.productId}
    productName={data.productName}
    productSku={data.productSku}
    categoryId={data.categoryId}
    categoryName={data.categoryName}
    initialGroups={data.groups}
    initialAttributes={data.initialAttributes}
  />;
}
