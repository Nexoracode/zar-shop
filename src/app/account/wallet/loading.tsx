export default function AccountWalletLoading() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <div className="h-28 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
      <div className="h-5 w-40 animate-pulse rounded bg-[var(--surface)]" />
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
      ))}
    </div>
  );
}
