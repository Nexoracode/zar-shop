import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function UsersLoading() {
  return <BpListPageSkeleton columns={8} rows={10} selects={2} minWidth={880} withAction />;
}
