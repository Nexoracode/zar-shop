import { BpBar, BpStatCardsSkeleton } from "@/components/admin/blueprint/skeleton";

// Dashboard placeholder — mirrors `BlueprintDashboardView`: KPI row, chart + donut, recent
// orders table with the low-stock / shortcuts sidebar. Child routes carry their own `loading.tsx`.
export default function AdminDashboardLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-8" aria-hidden>
      <header className="flex flex-col gap-2 border-b border-[var(--bp-divider)] pb-5">
        <BpBar className="h-2.5 w-40" />
        <BpBar className="h-6 w-56" />
        <BpBar className="h-3 w-80 max-w-full" />
      </header>

      <BpStatCardsSkeleton count={4} />

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
        <div className="bp-frame relative p-[18px]">
          <BpBar className="h-2.5 w-24" />
          <BpBar className="mt-1.5 h-3 w-48 max-w-full" />
          <BpBar className="mt-4 h-[200px] w-full" />
        </div>
        <div className="bp-frame relative p-[18px]">
          <BpBar className="h-2.5 w-32" />
          <BpBar className="mt-1.5 h-3 w-40 max-w-full" />
          <BpBar className="mx-auto mt-4 h-[180px] w-[180px] rounded-full" />
        </div>
      </div>

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
        <div className="bp-frame relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--bp-divider)] px-[18px] py-4">
            <div className="flex flex-col gap-1.5">
              <BpBar className="h-2.5 w-24" />
              <BpBar className="h-3 w-44" />
            </div>
            <BpBar className="h-3 w-20" />
          </div>
          {Array.from({ length: 6 }).map((_, row) => (
            <div key={row} className="flex items-center gap-4 border-b border-[var(--bp-row-line)] px-[18px] py-3.5 last:border-b-0">
              {Array.from({ length: 6 }).map((__, cell) => (
                <BpBar key={cell} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
        <div className="grid content-start gap-2">
          {Array.from({ length: 2 }).map((_, block) => (
            <div key={block} className="bp-frame relative p-[18px]">
              <BpBar className="h-2.5 w-28" />
              <div className="mt-4 flex flex-col gap-2.5">
                {Array.from({ length: 4 }).map((__, line) => (
                  <BpBar key={line} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
