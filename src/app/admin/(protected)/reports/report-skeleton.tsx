/** Placeholder shown while the report figures are queried — both as the route `loading.tsx` and
 * as the `<Suspense>` fallback when the date range changes. Mirrors the real layout so the page
 * does not jump when the data arrives. */
export function ReportSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-2" aria-hidden>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bp-frame h-[104px] p-[18px]">
            <div className="h-2.5 w-24 rounded bg-[var(--bp-surface)]" />
            <div className="mt-3 h-6 w-32 rounded bg-[var(--bp-surface)]" />
            <div className="mt-2 h-2 w-20 rounded bg-[var(--bp-surface)]" />
          </div>
        ))}
      </div>
      <div className="bp-frame h-[260px] p-[18px]">
        <div className="h-2.5 w-32 rounded bg-[var(--bp-surface)]" />
        <div className="mt-4 h-[180px] w-full rounded bg-[var(--bp-surface)]" />
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="bp-frame h-[280px] p-[18px]">
            <div className="h-2.5 w-40 rounded bg-[var(--bp-surface)]" />
            <div className="mt-4 space-y-2.5">
              {Array.from({ length: 5 }).map((__, row) => (
                <div key={row} className="h-4 w-full rounded bg-[var(--bp-surface)]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
