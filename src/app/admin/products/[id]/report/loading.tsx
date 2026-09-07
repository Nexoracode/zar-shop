import { BpPageHeaderSkeleton, BpStatCardsSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ProductReportLoading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <BpPageHeaderSkeleton withBack />
      <BpStatCardsSkeleton count={3} columns="sm:grid-cols-3" />
    </div>
  );
}
