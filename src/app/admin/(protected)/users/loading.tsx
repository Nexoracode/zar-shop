import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function UsersLoading() {
  return <BpListPageSkeleton spaced columns={10} rows={10} minWidth={880} withAction leading={2} rowHeight={57} />;
}
