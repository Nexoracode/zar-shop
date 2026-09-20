// Mirrors the cart page block for block — same container, columns, card radius and padding, and a cart
// line the size of a real `CartItemCard` — so nothing shifts when the content arrives.
const bar = "animate-pulse rounded-md bg-[var(--surface-secondary)]";

function CartLineSkeleton() {
  return (
    <div className="grid gap-4 border-b border-[var(--border)] p-4 last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)] sm:p-5">
      <div className={`${bar} mx-auto size-36 rounded-xl sm:mx-0`} />
      <div className="min-w-0">
        <div className={`${bar} h-5 w-3/4`} />
        <div className={`${bar} mt-2 h-5 w-1/2`} />
        <div className="mt-3 grid gap-2">
          <div className={`${bar} h-4 w-28`} />
          <div className={`${bar} h-4 w-52`} />
          <div className={`${bar} h-4 w-44`} />
        </div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div className="h-11 w-[124px] animate-pulse rounded-lg border border-[var(--border)] bg-[var(--surface)]" />
          <div className="grid justify-items-end gap-1.5">
            <div className={`${bar} h-4 w-24`} />
            <div className={`${bar} h-5 w-32`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartLoading() {
  return (
    <main aria-busy="true" aria-label="در حال بارگذاری سبد خرید" className="min-h-dvh bg-[var(--background)] px-4 pb-[calc(66px+env(safe-area-inset-bottom)+16px)] pt-8 sm:px-6 sm:pt-12 lg:pb-12">
      <div className="mx-auto w-full max-w-[var(--store-content-max-width)]">
        <div className="mb-6">
          <div className={`${bar} h-8 w-44`} />
          <div className={`${bar} mt-2 h-5 w-36`} />
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
              <div className={`${bar} size-5`} />
              <div className={`${bar} h-4 w-28`} />
              <div className={`${bar} h-3 w-14`} />
            </div>
            <CartLineSkeleton />
            <CartLineSkeleton />
          </section>

          <aside className="grid gap-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              <div className={`${bar} h-6 w-32`} />
              <div className="mt-5 grid gap-3">
                <div className="flex items-center justify-between gap-4"><div className={`${bar} h-4 w-44`} /><div className={`${bar} h-4 w-24`} /></div>
                <div className="flex items-center justify-between gap-4 rounded-lg bg-[var(--surface-secondary)] px-3 py-2.5"><div className={`${bar} h-4 w-28`} style={{ backgroundColor: "var(--surface)" }} /><div className={`${bar} h-4 w-24`} style={{ backgroundColor: "var(--surface)" }} /></div>
                <div className="flex items-center justify-between gap-4"><div className={`${bar} h-5 w-28`} /><div className={`${bar} h-5 w-36`} /></div>
              </div>
              <div className={`${bar} mt-5 min-h-12 w-full rounded-lg`} />
              <div className="mt-4 grid gap-1.5">
                <div className={`${bar} h-3 w-full`} />
                <div className={`${bar} h-3 w-2/3`} />
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
              <div className="flex items-center gap-2.5"><div className={`${bar} size-9 rounded-full`} /><div className={`${bar} h-4 w-48`} /></div>
              <div className={`${bar} mx-3.5 mt-4 h-2.5 rounded-full`} />
              <div className="mt-2.5 flex items-center justify-between gap-3"><div className={`${bar} h-3 w-40`} /><div className={`${bar} h-3 w-20`} /></div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
