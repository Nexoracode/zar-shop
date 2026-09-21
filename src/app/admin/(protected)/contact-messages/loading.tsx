import { BpListPageSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ContactMessagesLoading() {
  return <BpListPageSkeleton searchInCard spaced cardBreak="lg" columns={6} rows={10} minWidth={900} rowHeight={64} />;
}
