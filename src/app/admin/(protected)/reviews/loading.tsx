import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ReviewsLoading() {
  return <BpListPageSkeleton searchInCard spaced metrics="reviews" columns={7} rows={10} minWidth={960} rowHeight={70} />;
}
