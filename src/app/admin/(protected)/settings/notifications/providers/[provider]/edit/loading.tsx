import { BpFormPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function EditSmsProviderLoading() {
  return <BpFormPageSkeleton sections={[3, 4]} columns={2} withActionBar={false} />;
}
