import { BlueprintProductAttributesManager } from "@/components/admin/blueprint/product-attributes-manager";
import { requirePermission } from "@/modules/auth/session";

export default async function ProductAttributesIndexPage() {
  await requirePermission("catalog:manage");
  return <BlueprintProductAttributesManager />;
}
