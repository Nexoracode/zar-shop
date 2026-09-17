import { BlueprintManualOrderForm } from "@/components/admin/blueprint/manual-order-form";
import { requirePermission } from "@/modules/auth/session";
import { getStoreIndustry } from "@/modules/settings/store-settings";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function NewManualOrderPage() {
  await requirePermission("orders:manage");
  const industry = await getStoreIndustry();
  return <BlueprintManualOrderForm industry={industry} />;
}
