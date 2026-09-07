import { BpBar, BpPageHeaderSkeleton, BpTableSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ManualSmsLoading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <BpPageHeaderSkeleton withBack withAction />
      <section className="bp-frame relative p-[16px]">
        <BpBar className="h-2.5 w-40" />
        <div className="mt-4">
          <BpTableSkeleton columns={8} rows={6} minWidth={880} />
        </div>
      </section>
    </div>
  );
}
