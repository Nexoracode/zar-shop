// Fills the account content column while a section resolves; the sidebar comes from the layout
// and stays put.
export default function AccountLoading() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <div className="h-14 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
      ))}
    </div>
  );
}
