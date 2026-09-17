import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function OrdersLoading() {
  return <BpListPageSkeleton columns={9} rows={10} selects={1} minWidth={960} withAction />;
}
