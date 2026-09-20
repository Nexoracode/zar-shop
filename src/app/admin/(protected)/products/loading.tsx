import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ProductsLoading() {
  return <BpListPageSkeleton columns={10} rows={10} minWidth={1100} withAction leading={2} rowHeight={72} />;
}
