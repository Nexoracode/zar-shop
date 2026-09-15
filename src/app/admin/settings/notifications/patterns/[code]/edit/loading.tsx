import { BpFormPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function EditSmsPatternLoading() {
  return <BpFormPageSkeleton sections={[3, 4]} columns={2} withActionBar={false} />;
}
