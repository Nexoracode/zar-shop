import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function TicketsLoading() {
  return <BpListPageSkeleton searchInCard columns={8} rows={10} minWidth={980} rowHeight={57} />;
}
