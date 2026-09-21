import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ArticlesLoading() {
  return <BpListPageSkeleton searchInCard columns={7} rows={10} minWidth={720} withAction leading={2} rowHeight={64} />;
}
