import { BpBar, BpPageHeaderSkeleton, BpTableSkeleton } from "@/components/admin/blueprint/skeleton";

// Mirrors `admin/gold/page.tsx`: latest-rate card beside the cache-settings card, the history
// chart, then the 48-record table.
export default function GoldPriceLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-2" aria-hidden>
      <BpPageHeaderSkeleton flush />

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="bp-frame relative p-[18px]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <BpBar className="size-11 shrink-0" />
              <div className="flex flex-col gap-2">
                <BpBar className="h-2.5 w-40" />
                <BpBar className="h-6 w-32" />
              </div>
            </div>
            <BpBar className="h-5 w-16" />
          </div>
          <div className="mt-4 grid gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 sm:grid-cols-2">
            <BpBar className="h-9 w-full" />
            <BpBar className="h-9 w-full" />
          </div>
          <BpBar className="mt-3 h-9 w-40" />
        </section>

        <section className="bp-frame relative p-[18px]">
          <BpBar className="h-3 w-32" />
          <div className="mt-4 flex flex-col gap-3">
            <BpBar className="h-4 w-full" />
            <BpBar className="h-4 w-full" />
          </div>
          <BpBar className="mt-3 h-3 w-28" />
        </section>
      </div>

      <section className="bp-frame relative p-[18px]">
        <BpBar className="h-2.5 w-24" />
        <BpBar className="mt-1.5 h-3 w-48" />
        <BpBar className="mt-4 h-[200px] w-full" />
      </section>

      <section className="bp-frame relative overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--bp-divider)] px-[18px] py-4">
          <BpBar className="h-4 w-4" />
          <BpBar className="h-3 w-28" />
        </div>
        <BpTableSkeleton columns={4} rows={10} minWidth={520} />
      </section>
    </div>
  );
}
