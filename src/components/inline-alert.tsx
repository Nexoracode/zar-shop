import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type AlertStatus = "info" | "success" | "warning" | "danger";

const statusIcon: Record<AlertStatus, typeof Info> = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };

/** Tinted, icon-badged message card with an optional inline action — nicer replacement for the bare HeroUI Alert. */
export function InlineAlert({ status = "info", children, action, className = "" }: { status?: AlertStatus; children: ReactNode; action?: ReactNode; className?: string }) {
  const Icon = statusIcon[status];
  const color = `var(--${status})`;
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 ${className}`}
      style={{ background: `color-mix(in srgb, ${color} 9%, var(--surface))`, borderColor: `color-mix(in srgb, ${color} 22%, transparent)` }}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="m-0 text-[13px] leading-7 text-[var(--foreground)]">{children}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
