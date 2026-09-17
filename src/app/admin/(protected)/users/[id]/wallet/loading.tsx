import { BpBar, BpPageHeaderSkeleton } from "@/components/admin/blueprint/skeleton";

export default function AdminUserWalletLoading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <BpPageHeaderSkeleton withBack />
      <div className="grid items-start gap-2 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="grid content-start gap-2">
          <div className="bp-frame relative p-[18px]"><BpBar className="h-12 w-full" /></div>
          <div className="bp-frame relative p-[18px]">
            <BpBar className="h-2.5 w-32" />
            <div className="mt-4 grid gap-3">
              <BpBar className="h-9 w-full" />
              <BpBar className="h-16 w-full" />
              <BpBar className="h-9 w-28" />
            </div>
          </div>
        </div>
        <div className="bp-frame relative p-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <BpBar key={index} className="mb-2 h-9 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
