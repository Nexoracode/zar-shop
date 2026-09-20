import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function AuditLogsLoading() {
  return <BpListPageSkeleton spaced filterSelects={1} toolbar="readonly" columns={7} rows={12} minWidth={920} rowHeight={50} />;
}
