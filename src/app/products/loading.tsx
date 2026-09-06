// Shown while the catalogue page resolves — it fetches and prices the whole active catalogue,
// which is the slowest read in the storefront. Mirrors the real layout so the shell does not jump.
export default function ProductsLoading() {
  return (
    <main className="bg-white px-4 py-7 sm:px-6 lg:py-10" aria-busy="true">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-5 h-4 w-40 animate-pulse rounded bg-slate-100" />
        <div className="grid items-start gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="grid gap-3">
              {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
            </div>
          </aside>
          <section className="min-w-0">
            <div className="mb-5 h-10 animate-pulse rounded bg-slate-100" />
            <div className="grid grid-cols-2 gap-px border-r border-t border-slate-200 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {Array.from({ length: 15 }).map((_, index) => (
                <div key={index} className="flex min-h-[390px] flex-col gap-3 border-b border-l border-slate-200 p-4">
                  <div className="mx-auto aspect-square w-full max-w-[245px] animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="mt-auto h-5 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
