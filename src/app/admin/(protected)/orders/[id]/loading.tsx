import { BpBar, BpPageHeaderSkeleton } from "@/components/admin/blueprint/skeleton";

// Mirrors `BlueprintOrderDetail`: header with the status control, the four-cell summary strip, then the
// products / payments cards beside the tracking / buyer / address / invoice column.

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bp-frame relative overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--bp-divider)] px-4 py-3">
        <BpBar className="size-4 shrink-0" />
        <div className="flex h-[22px] items-center"><BpBar className="h-3 w-28" /></div>
      </div>
      {children}
    </div>
  );
}

function Row({ label = "w-16", value = "w-28" }: { label?: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--bp-row-line)] py-2.5 first:pt-0 last:border-b-0 last:pb-0">
      <BpBar className={`h-3 ${label}`} />
      <BpBar className={`h-3.5 ${value}`} />
    </div>
  );
}

function Figure({ value, note }: { value: string; note?: boolean }) {
  return (
    <div className="bg-[var(--bp-card)] p-4">
      <div className="flex h-[19px] items-center"><BpBar className="h-2.5 w-20" /></div>
      <div className="mt-2 flex h-[22px] items-center"><BpBar className={`h-4 ${value}`} /></div>
      {note && <div className="mt-1 flex h-5 items-center"><BpBar className="h-2.5 w-32" /></div>}
    </div>
  );
}

function ItemRow() {
  return (
    <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-3 gap-y-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0 sm:grid-cols-[56px_minmax(0,1fr)_auto]">
      <BpBar className="size-14 shrink-0" />
      <div className="flex min-w-0 flex-col gap-2">
        <BpBar className="h-3.5 w-48 max-w-full" />
        <BpBar className="h-2.5 w-28" />
        <div className="flex gap-1.5"><BpBar className="h-5 w-16" /><BpBar className="h-5 w-20" /></div>
      </div>
      <div className="col-span-full flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end sm:gap-1">
        <BpBar className="h-3 w-28" />
        <BpBar className="h-4 w-24" />
      </div>
    </div>
  );
}

export default function OrderDetailLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-3" aria-hidden>
      <BpPageHeaderSkeleton flush withBack withAction actionClassName="h-9 w-[190px]" />

      <div className="bp-frame relative overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-[var(--bp-divider)] lg:grid-cols-4">
          <Figure value="w-32" note />
          <Figure value="w-20" note />
          <Figure value="w-36" />
          <Figure value="w-28" note />
        </div>
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <Card>
            <ItemRow />
            <ItemRow />
            <div className="flex flex-col gap-4 border-t border-[var(--bp-divider)] bg-[var(--bp-hover)] p-4 md:flex-row md:items-start">
              <dl className="m-0 grid w-full gap-2.5 md:ms-auto md:max-w-[340px]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex h-5 items-center justify-between gap-4"><BpBar className="h-3 w-20" /><BpBar className="h-3 w-24" /></div>
                ))}
                <div className="flex items-center justify-between gap-4 border-t border-[var(--bp-divider)] pt-3"><BpBar className="h-3.5 w-20" /><BpBar className="h-5 w-28" /></div>
              </dl>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2"><BpBar className="h-4 w-28" /><BpBar className="h-3 w-16" /></div>
                <BpBar className="h-6 w-20" />
              </div>
              <div className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex flex-col gap-1.5"><BpBar className="h-2.5 w-20" /><BpBar className="h-3.5 w-28" /></div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <aside className="flex min-w-0 flex-col gap-3">
          <Card>
            <div className="grid gap-3 p-4">
              <div><BpBar className="h-9 w-full" /><div className="h-[22px]" /></div>
              <div className="flex h-5 items-center"><BpBar className="h-2.5 w-64 max-w-full" /></div>
              <BpBar className="h-9 w-full" />
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="mb-4 flex items-center gap-3"><BpBar className="size-10 shrink-0 rounded-full" /><BpBar className="h-4 w-32" /></div>
              <Row />
              <Row label="w-12" value="w-40" />
              <Row label="w-14" />
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <Row label="w-20" />
              <Row />
              <Row label="w-20" value="w-24" />
              <Row label="w-14" />
              <div className="py-2.5 last:pb-0"><BpBar className="h-2.5 w-12" /><div className="mt-1 flex flex-col gap-1.5"><BpBar className="h-3.5 w-full" /><BpBar className="h-3.5 w-3/4" /></div></div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <Row label="w-20" />
              <Row label="w-16" value="w-32" />
              <div className="mt-4"><BpBar className="h-9 w-full" /></div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
