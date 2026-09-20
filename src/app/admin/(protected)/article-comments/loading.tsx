import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ArticleCommentsLoading() {
  return <BpListPageSkeleton spaced metrics="comments" filterSelects={1} toolbar="none" cardBreak="xl" columns={5} rows={10} minWidth={880} leading={0} rowHeight={70} />;
}
