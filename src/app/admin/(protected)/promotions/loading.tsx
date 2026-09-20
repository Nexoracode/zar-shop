import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function PromotionsLoading() {
  return <BpListPageSkeleton columns={6} rows={9} minWidth={860} withAction rowHeight={57} />;
}
