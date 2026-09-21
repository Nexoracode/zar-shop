import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function PaymentsLoading() {
  return <BpListPageSkeleton searchInCard toolbar="readonly" columns={8} rows={10} minWidth={960} />;
}
