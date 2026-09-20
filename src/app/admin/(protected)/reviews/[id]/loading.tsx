import { BpBar, BpMetricCardsSkeleton, BpPageHeaderSkeleton } from "@/components/admin/blueprint/skeleton";

// Mirrors the review detail page: the four metrics, then the review with its replies beside the moderation card.
export default function ReviewDetailLoading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <BpPageHeaderSkeleton withBack withAction />
      <BpMetricCardsSkeleton preset="detailQuad" />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="grid min-w-0 gap-4">
          <section className="bp-frame relative overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-[var(--bp-divider)] p-[18px] sm:flex-row sm:items-center">
              <BpBar className="size-11 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-2"><BpBar className="h-3.5 w-32" /><BpBar className="h-3 w-24" /></div>
              <BpBar className="h-[38px] w-28 shrink-0" />
            </div>
            <div className="flex flex-col gap-3.5 p-[18px]"><BpBar className="h-3.5 w-full" /><BpBar className="h-3.5 w-full" /><BpBar className="h-3.5 w-2/3" /></div>
            <div className="grid gap-px border-t border-[var(--bp-divider)] bg-[var(--bp-divider)] sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="bg-[var(--bp-card)] p-3"><BpBar className="h-2.5 w-14" /><BpBar className="mt-2 h-3 w-24" /></div>
              ))}
            </div>
          </section>
          <section className="bp-frame relative overflow-hidden">
            <div className="flex items-start gap-3 border-b border-[var(--bp-divider)] p-[18px]">
              <BpBar className="size-9 shrink-0" />
              <div className="flex flex-1 flex-col gap-2"><BpBar className="h-3 w-28" /><BpBar className="h-2.5 w-64 max-w-full" /></div>
            </div>
            <div className="flex items-start gap-3 p-[18px]">
              <BpBar className="size-9 shrink-0" />
              <div className="flex flex-1 flex-col gap-2.5"><BpBar className="h-3 w-40" /><BpBar className="h-3.5 w-full" /><BpBar className="h-3.5 w-2/3" /></div>
            </div>
          </section>
        </main>
        <aside>
          <section className="bp-frame relative overflow-hidden">
            <div className="border-b border-[var(--bp-divider)] p-[18px]">
              <div className="flex items-start gap-3"><BpBar className="size-10 shrink-0" /><div className="flex flex-1 flex-col gap-2"><BpBar className="h-2.5 w-24" /><BpBar className="h-3 w-full" /></div></div>
            </div>
            <div className="grid gap-3 p-[18px]">
              <BpBar className="h-[90px] w-full" />
              <div className="flex gap-2"><BpBar className="h-9 flex-1" /><BpBar className="h-9 flex-1" /></div>
              <BpBar className="h-[90px] w-full" />
              <BpBar className="h-9 w-full" />
              <BpBar className="h-9 w-full" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
