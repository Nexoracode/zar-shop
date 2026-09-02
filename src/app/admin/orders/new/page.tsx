import { BlueprintManualOrderForm } from "@/components/admin/blueprint/manual-order-form";
import { requirePermission } from "@/modules/auth/session";
import { getStoreIndustry } from "@/modules/settings/store-settings";

export default async function NewManualOrderPage() {
  await requirePermission("orders:manage");
  const industry = await getStoreIndustry();
  return <BlueprintManualOrderForm industry={industry} />;
}
