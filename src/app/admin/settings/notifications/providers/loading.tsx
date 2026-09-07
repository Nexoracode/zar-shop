import { BpBar, BpPageHeaderSkeleton, BpTableSkeleton } from "@/components/admin/blueprint/skeleton";

export default function SmsProvidersLoading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <BpPageHeaderSkeleton withBack withAction />
      <section className="bp-frame relative p-[16px]">
        <BpBar className="h-2.5 w-40" />
        <div className="mt-4">
          <BpTableSkeleton columns={6} rows={4} minWidth={780} />
        </div>
      </section>
    </div>
  );
}
