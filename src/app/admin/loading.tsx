// Generic skeleton for admin page transitions — the shell and sidebar come from the layout.
export default function AdminLoading() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <div className="h-16 animate-pulse rounded-xl bg-[var(--bp-surface,#e9e9ea)]" />
      <div className="h-11 animate-pulse rounded-xl bg-[var(--bp-surface,#e9e9ea)]" />
      <div className="h-[420px] animate-pulse rounded-xl bg-[var(--bp-surface,#e9e9ea)]" />
    </div>
  );
}
