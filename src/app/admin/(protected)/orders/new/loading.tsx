import { BpBar, BpPageHeaderSkeleton } from "@/components/admin/blueprint/skeleton";

// Mirrors `BlueprintManualOrderForm`: customer, items, delivery and payment panels beside the amounts summary.
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="bp-frame relative">
      <div className="flex items-center gap-2 border-b border-[var(--bp-divider)] px-4 py-3">
        <BpBar className="size-4 shrink-0" />
        <div className="flex h-[22px] items-center"><BpBar className="h-3 w-24" /></div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field() {
  return (
    <div>
      <div className="mb-[5px] flex h-[19px] items-center"><BpBar className="h-2.5 w-20" /></div>
      <BpBar className="h-9 w-full" />
      <div className="h-[22px]" />
    </div>
  );
}

export default function NewManualOrderLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-2" aria-hidden>
      <BpPageHeaderSkeleton flush />
      <div className="grid items-start gap-2 xl:grid-cols-[minmax(0,1fr)_324px]">
        <div className="flex min-w-0 flex-col gap-2">
          <Panel>
            <BpBar className="mb-3 h-9 w-56" />
            <BpBar className="h-9 w-full" />
          </Panel>
          <Panel>
            <div className="grid gap-2">
              <BpBar className="h-9 w-full" />
              <div className="grid gap-2 border border-[var(--bp-divider)] p-3 sm:grid-cols-[minmax(0,1fr)_130px_92px_auto] sm:items-end">
                <BpBar className="h-9 w-full" /><BpBar className="h-9 w-full" /><BpBar className="h-9 w-full" /><BpBar className="size-9" />
              </div>
            </div>
          </Panel>
          <Panel>
            <BpBar className="mb-3 h-9 w-56" />
            <div className="grid gap-3 sm:grid-cols-2"><Field /><Field /></div>
          </Panel>
          <Panel>
            <div className="grid gap-3 sm:grid-cols-2"><Field /><Field /></div>
          </Panel>
        </div>
        <aside className="flex min-w-0 flex-col gap-2">
          <section className="bp-frame relative min-w-0">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--bp-divider)] px-4 py-3">
              <div className="flex h-[22px] items-center"><BpBar className="h-3 w-24" /></div>
            </div>
            <div className="flex flex-col gap-3 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex h-5 items-center justify-between gap-4"><BpBar className="h-3 w-20" /><BpBar className="h-3 w-24" /></div>
              ))}
              <BpBar className="mt-1 h-9 w-full" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
