export default function CartLoading() {
  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6" aria-busy="true">
      <div className="mb-6 h-7 w-40 animate-pulse rounded bg-slate-100" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />)}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
      </div>
    </main>
  );
}
