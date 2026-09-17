import { BlueprintProductAttributesManager } from "@/components/admin/blueprint/product-attributes-manager";
import { requirePermission } from "@/modules/auth/session";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function ProductAttributesIndexPage() {
  await requirePermission("catalog:manage");
  return <BlueprintProductAttributesManager />;
}
