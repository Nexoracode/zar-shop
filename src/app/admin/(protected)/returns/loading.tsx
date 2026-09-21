import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ReturnsLoading() {
  return <BpListPageSkeleton searchInCard metrics="returns" columns={9} rows={10} minWidth={960} leading={2} rowHeight={57} />;
}
