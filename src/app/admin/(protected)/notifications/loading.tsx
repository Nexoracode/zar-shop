import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function NotificationsLoading() {
  return <BpListPageSkeleton filterSelects={2} toolbar="readonly" columns={7} rows={10} minWidth={1000} leading={0} trailing={false} />;
}
