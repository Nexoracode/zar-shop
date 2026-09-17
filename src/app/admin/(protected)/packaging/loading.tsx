import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function PackagingLoading() {
  return <BpListPageSkeleton columns={8} rows={5} selects={2} minWidth={880} withAction paginated={false} />;
}
