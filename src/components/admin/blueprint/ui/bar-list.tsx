export type BpBarListItem = { label: string; value: number; valueLabel: string; hint?: string };

/** A ranked list where each row carries a proportional bar — provinces, top products and the like. Server-renderable. */
export function BpBarList({ items, ariaLabel, color = "var(--bp-accent)" }: { items: BpBarListItem[]; ariaLabel: string; color?: string }) {
  const peak = Math.max(1, ...items.map((item) => item.value));
  return (
    <ol aria-label={ariaLabel} className="m-0 grid list-none gap-3 p-0">
      {items.map((item, index) => (
        <li key={item.label} className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-[12px]">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="bp-muted w-4 shrink-0 text-[10px]">{(index + 1).toLocaleString("fa-IR")}</span>
              <span className="truncate font-bold">{item.label}</span>
            </span>
            <span className="shrink-0 font-bold">{item.valueLabel}</span>
          </div>
          <div className="bp-bar-track" role="presentation"><span className="bp-bar-fill" style={{ width: `${Math.max(2, (item.value / peak) * 100)}%`, background: color }} /></div>
          {item.hint && <span className="bp-muted text-[10px]">{item.hint}</span>}
        </li>
      ))}
    </ol>
  );
}
