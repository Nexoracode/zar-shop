import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ReviewsLoading() {
  return <BpListPageSkeleton columns={7} rows={10} selects={1} minWidth={860} />;
}
