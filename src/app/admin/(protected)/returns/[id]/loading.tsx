import { BpBar, BpDetailItemsSkeleton, BpPageHeaderSkeleton, BpTableCardSkeleton, BpTitledCardSkeleton } from "@/components/admin/blueprint/skeleton";

// Mirrors `admin/returns/[id]/page.tsx`: buyer and order side by side, the refund method, the reason and the
// requested items, beside the decision panel.
export default function ReturnDetailLoading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <BpPageHeaderSkeleton withBack />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid content-start gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <BpTitledCardSkeleton><BpDetailItemsSkeleton count={3} /></BpTitledCardSkeleton>
            <BpTitledCardSkeleton><BpDetailItemsSkeleton count={6} /></BpTitledCardSkeleton>
          </div>
          <BpTitledCardSkeleton><BpDetailItemsSkeleton count={4} twoColumns /></BpTitledCardSkeleton>
          <BpTitledCardSkeleton>
            <div className="flex flex-col gap-2.5"><BpBar className="h-3.5 w-full" /><BpBar className="h-3.5 w-full" /><BpBar className="h-3.5 w-2/3" /></div>
          </BpTitledCardSkeleton>
          <BpTableCardSkeleton columns={5} rows={2} />
        </div>
        <aside className="grid content-start gap-4">
          <section className="bp-frame relative p-[18px]">
            <div className="mb-3 flex h-6 items-center justify-between gap-2"><BpBar className="h-3 w-28" /><BpBar className="h-6 w-20" /></div>
            <div className="mb-[5px] flex h-[19px] items-center"><BpBar className="h-2.5 w-20" /></div>
            <BpBar className="h-[90px] w-full" />
            <div className="h-[22px]" />
            <div className="mt-2 flex flex-wrap gap-2"><BpBar className="h-9 w-24" /><BpBar className="h-9 w-24" /></div>
          </section>
        </aside>
      </div>
    </div>
  );
}
