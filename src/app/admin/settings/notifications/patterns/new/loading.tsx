import { BpFormPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function NewSmsPatternLoading() {
  return <BpFormPageSkeleton sections={[3, 4]} columns={2} withActionBar={false} />;
}
