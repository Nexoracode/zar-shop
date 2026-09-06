// Shown while a product page resolves — it runs several queries plus a live gold-rate read.
// Mirrors the real two-column layout so the header and footer do not shift when content lands.
export default function ProductLoading() {
  return (
    <main className="bg-white px-4 pb-16 pt-5 sm:px-6 lg:pb-24" aria-busy="true">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mb-6 h-4 w-56 animate-pulse rounded bg-slate-100" />
        <div className="grid items-stretch gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid items-start gap-7 lg:grid-cols-[minmax(330px,1.05fr)_minmax(0,1.1fr)]">
            <div className="aspect-square w-full animate-pulse rounded-xl bg-slate-100" />
            <div className="grid gap-4">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
              <div className="h-7 w-3/4 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[62px] animate-pulse rounded-lg bg-slate-100" />)}
              </div>
            </div>
          </div>
          <div className="h-[420px] animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div className="mt-10 h-16 animate-pulse rounded bg-slate-100" />
      </div>
    </main>
  );
}
