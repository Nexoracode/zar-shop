import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ArticlesLoading() {
  return <BpListPageSkeleton columns={7} rows={10} selects={2} minWidth={720} withAction />;
}
