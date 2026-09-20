import { BpBar, BpPageHeaderSkeleton } from "@/components/admin/blueprint/skeleton";

// Mirrors `BlueprintContactMessageDetailView`: the sender and message beside the follow-up status card.
export default function ContactMessageDetailLoading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <BpPageHeaderSkeleton withBack withAction />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0">
          <section className="bp-frame relative overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-[var(--bp-divider)] p-[18px] sm:flex-row sm:items-center">
              <BpBar className="size-11 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-2"><BpBar className="h-3.5 w-32" /><BpBar className="h-3 w-72 max-w-full" /></div>
            </div>
            <div className="p-[18px]">
              <div className="mb-3 flex h-5 items-center gap-2"><BpBar className="size-4 shrink-0" /><BpBar className="h-3 w-40" /></div>
              <div className="flex flex-col gap-3"><BpBar className="h-3.5 w-full" /><BpBar className="h-3.5 w-full" /><BpBar className="h-3.5 w-3/4" /></div>
            </div>
          </section>
        </main>
        <aside>
          <section className="bp-frame relative overflow-hidden">
            <div className="border-b border-[var(--bp-divider)] p-[18px]">
              <div className="flex items-start gap-3"><BpBar className="size-10 shrink-0" /><div className="flex flex-1 flex-col gap-2"><BpBar className="h-2.5 w-24" /><BpBar className="h-3 w-full" /></div></div>
              <BpBar className="mt-3 h-[44px] w-full" />
            </div>
            <div className="p-[18px]"><BpBar className="h-9 w-full" /></div>
          </section>
        </aside>
      </div>
    </div>
  );
}
