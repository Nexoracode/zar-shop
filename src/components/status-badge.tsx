import type { ReactNode } from "react";
import type { AdminTone } from "@/modules/admin/labels";

/**
 * The storefront/account counterpart of `AdminStatusBadge` — one pill, one place, coloured from
 * the design-system semantic tokens (`--success` / `--warning` / `--danger` / `--info`) rather
 * than raw Tailwind palette values. `tone` comes from the shared `*StatusTones` maps.
 */
const toneClass: Record<AdminTone, string> = {
  neutral: "bg-[var(--surface-secondary)] text-[var(--muted)]",
  info: "bg-[color-mix(in_srgb,var(--info)_12%,transparent)] text-[var(--info)]",
  success: "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]",
  warning: "bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-[var(--warning)]",
  danger: "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]",
  gold: "bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-[var(--warning)]",
};

export function StatusBadge({ tone = "neutral", className = "", children }: { tone?: AdminTone; className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass[tone]} ${className}`.trim()}>
      {children}
    </span>
  );
}
