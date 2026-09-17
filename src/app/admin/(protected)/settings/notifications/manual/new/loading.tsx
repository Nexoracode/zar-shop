import { BpFormPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function NewManualSmsLoading() {
  return <BpFormPageSkeleton sections={[3, 3]} columns={1} withActionBar={false} />;
}
