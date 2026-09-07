import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ProductsLoading() {
  return <BpListPageSkeleton columns={9} rows={10} selects={5} minWidth={1100} withAction />;
}
