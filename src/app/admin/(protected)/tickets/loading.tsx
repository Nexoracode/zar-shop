import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function TicketsLoading() {
  return <BpListPageSkeleton columns={8} rows={10} selects={3} minWidth={900} />;
}
