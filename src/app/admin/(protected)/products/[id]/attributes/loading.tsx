import { BpFormPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ProductAttributesFormLoading() {
  return <BpFormPageSkeleton sections={[3, 3]} columns={2} withActionBar={false} />;
}
