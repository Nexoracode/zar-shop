export default function CheckoutLoading() {
  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6" aria-busy="true">
      <div className="mb-7 h-6 w-full max-w-md animate-pulse justify-self-center rounded bg-slate-100" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />)}
        </div>
        <div className="h-72 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
      </div>
    </main>
  );
}
