import { BpBar, BpDetailItemsSkeleton, BpPageHeaderSkeleton, BpTableCardSkeleton, BpTitledCardSkeleton } from "@/components/admin/blueprint/skeleton";

// Mirrors `admin/payments/[id]/page.tsx`: the transaction card, the order's items and the raw gateway
// data beside the related order, buyer, timestamps and invoice.
export default function PaymentDetailLoading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <BpPageHeaderSkeleton withBack />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid content-start gap-4">
          <BpTitledCardSkeleton title={false}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <BpBar className="size-11 shrink-0" />
                <div className="flex flex-col gap-1.5"><BpBar className="h-2.5 w-20" /><BpBar className="h-3.5 w-32" /></div>
              </div>
              <BpBar className="h-6 w-20" />
            </div>
            <BpDetailItemsSkeleton count={6} twoColumns className="border border-[var(--bp-divider)] p-3" />
            <BpBar className="mt-3 h-[50px] w-full" />
          </BpTitledCardSkeleton>
          <BpTableCardSkeleton columns={6} rows={3} />
          <BpTitledCardSkeleton>
            <BpBar className="h-40 w-full" />
          </BpTitledCardSkeleton>
        </div>
        <aside className="grid content-start gap-4">
          <BpTitledCardSkeleton><BpDetailItemsSkeleton count={8} /></BpTitledCardSkeleton>
          <BpTitledCardSkeleton><BpDetailItemsSkeleton count={4} /></BpTitledCardSkeleton>
          <BpTitledCardSkeleton><BpDetailItemsSkeleton count={3} /></BpTitledCardSkeleton>
          <BpTitledCardSkeleton><BpDetailItemsSkeleton count={3} /></BpTitledCardSkeleton>
        </aside>
      </div>
    </div>
  );
}
