import { BlueprintManualOrderForm } from "@/components/admin/blueprint/manual-order-form";
import { requirePermission } from "@/modules/auth/session";

export default async function NewManualOrderPage() {
  await requirePermission("orders:manage");
  return <BlueprintManualOrderForm />;
}
