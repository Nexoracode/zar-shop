import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ShippingMethodsLoading() {
  return <BpListPageSkeleton columns={8} rows={6} selects={2} minWidth={880} withAction paginated={false} />;
}
