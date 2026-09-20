import { BpFormBesideTableSkeleton } from "@/components/admin/blueprint/skeleton";

export default function BrandsLoading() {
  return <BpFormBesideTableSkeleton columns={9} rows={6} form={["field", "field", "image", "switch", "switch"]} />;
}
