import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function AuditLogsLoading() {
  return <BpListPageSkeleton columns={7} rows={12} selects={1} minWidth={900} readOnly />;
}
