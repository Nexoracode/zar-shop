import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function OrdersLoading() {
  return <BpListPageSkeleton searchInCard columns={9} rows={10} minWidth={960} withAction leading={2} rowHeight={50} />;
}
