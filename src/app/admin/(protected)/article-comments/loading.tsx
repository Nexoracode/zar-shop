import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ArticleCommentsLoading() {
  return <BpListPageSkeleton spaced metrics="comments" cardBreak="xl" columns={6} rows={10} minWidth={880} rowHeight={70} />;
}
