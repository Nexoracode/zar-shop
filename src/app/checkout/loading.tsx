// Mirrors the checkout page block for block — top bar, steps, heading, the three cards of the form and the
// summary and coupon column, with the same columns, radius and padding as the cart — so nothing shifts on arrival.
const bar = "animate-pulse rounded-md bg-[var(--surface-secondary)]";
const card = "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm";

function CardHeader({ titleWidth, withSubtitle = true }: { titleWidth: string; withSubtitle?: boolean }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className={`${bar} size-9 shrink-0 rounded-full`} />
      <div className="grid gap-1.5 pt-0.5">
        <div className={`${bar} h-5 ${titleWidth}`} />
        {withSubtitle && <div className={`${bar} h-3 w-56 max-w-full`} />}
      </div>
    </div>
  );
}

function OptionRow() {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] px-3 py-2.5">
      <div className={`${bar} size-9 shrink-0 rounded-lg`} />
      <div className="grid flex-1 gap-1.5"><div className={`${bar} h-4 w-28`} /><div className={`${bar} h-3 w-44 max-w-full`} /></div>
    </div>
  );
}

function ItemRow() {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div className={`${bar} size-16 shrink-0 rounded-lg sm:size-[72px]`} />
      <div className="grid min-w-0 flex-1 gap-1.5"><div className={`${bar} h-4 w-3/4`} /><div className={`${bar} h-3 w-24`} /><div className={`${bar} h-5 w-14`} /></div>
      <div className="grid justify-items-end gap-1.5"><div className={`${bar} h-3 w-16`} /><div className={`${bar} h-4 w-24`} /></div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><div className={`${bar} h-4 ${label}`} /><div className={`${bar} h-4 ${value}`} /></div>;
}

export default function CheckoutLoading() {
  return (
    <div aria-busy="true" aria-label="در حال بارگذاری تکمیل سفارش">
      <div className="w-full border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex min-h-16 max-w-[var(--store-content-max-width)] items-center justify-center px-4 sm:px-6"><div className={`${bar} h-6 w-28`} /></div>
      </div>
      <main className="min-h-[calc(100dvh-4rem)] bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-[var(--store-content-max-width)]">
          <div className="mb-7 flex items-center justify-center gap-2 sm:gap-4">
            <div className={`${bar} h-5 w-24`} />
            <span className="h-px w-8 shrink-0 bg-[var(--border)] sm:w-16" />
            <div className={`${bar} h-5 w-32`} />
            <span className="h-px w-8 shrink-0 bg-[var(--border)] sm:w-16" />
            <div className={`${bar} h-5 w-24`} />
          </div>
          <div className="mb-6">
            <div className={`${bar} h-8 w-40`} />
            <div className={`${bar} mt-2 h-5 w-64 max-w-full`} />
          </div>

          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="grid min-w-0 gap-5">
              <div className={card}>
                <CardHeader titleWidth="w-32" />
                <div className="grid gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2.5"><div className={`${bar} h-4 w-40`} /><div className={`${bar} h-3 w-3/4`} /></div>
              </div>
              <div className={card}>
                <CardHeader titleWidth="w-28" />
                <ItemRow />
                <ItemRow />
              </div>
              <div className={card}>
                <CardHeader titleWidth="w-24" />
                <div className="grid gap-2"><OptionRow /><OptionRow /></div>
              </div>
            </div>

            <aside className="grid min-w-0 gap-5 lg:sticky lg:top-24">
              <div className={card}>
                <div className="mb-4 flex items-center justify-between"><div className={`${bar} h-5 w-28`} /><div className={`${bar} h-3 w-14`} /></div>
                <div className="grid gap-3">
                  <SummaryRow label="w-24" value="w-28" />
                  <SummaryRow label="w-36" value="w-20" />
                  <div className="flex justify-between gap-4 border-t border-[var(--border)] pt-4"><div className={`${bar} h-5 w-32`} /><div className={`${bar} h-5 w-32`} /></div>
                </div>
                <div className={`${bar} mt-5 min-h-12 w-full rounded-lg`} />
              </div>
              <div className={card}>
                <CardHeader titleWidth="w-24" />
                <div className="flex gap-2"><div className="h-11 flex-1 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]" /><div className={`${bar} h-11 w-20 rounded-lg`} /></div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
