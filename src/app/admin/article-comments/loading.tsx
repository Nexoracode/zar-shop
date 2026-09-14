import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ArticleCommentsLoading() {
  return <BpListPageSkeleton columns={5} rows={10} selects={1} minWidth={800} />;
}
