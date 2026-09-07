// Fills the account content column while the summary resolves; the sidebar comes from the layout
// and stays put. Mirrors the two sections of /account: order stats, then recent visits.
export default function AccountLoading() {
  return (
    <div className="grid gap-6" aria-busy="true">
      <section className="grid gap-3">
        <div className="h-5 w-32 animate-pulse rounded bg-[var(--surface)]" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
          ))}
        </div>
      </section>
      <section className="grid gap-3">
        <div className="h-5 w-32 animate-pulse rounded bg-[var(--surface)]" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
          ))}
        </div>
      </section>
    </div>
  );
}
