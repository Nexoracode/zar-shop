import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, PackageOpen } from "lucide-react";
import type { AdminTone } from "@/modules/admin/labels";
import { BpTag } from "@/components/admin/blueprint/ui/tag";

/*
 * The handful of primitives almost every admin page uses. The panel has a single skin
 * (Blueprint), so these render Blueprint markup directly.
 */

export function AdminStatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: AdminTone }) {
  return <BpTag tone={tone} withDot>{children}</BpTag>;
}

export function AdminPageHeader({ title, description, action, backHref, backLabel = "بازگشت", flush = false }: { eyebrow?: string; title: string; description: string; action?: ReactNode; backHref?: string; backLabel?: string; flush?: boolean }) {
  // Most pages stack the header and their content directly, so the header carries the gap
  // itself. A page whose own container already spaces its children passes `flush`.
  const spacing = flush ? "" : "mb-6";
  return (
    <header className={`${spacing} flex flex-col gap-4 border-b border-[var(--bp-divider)] pb-2.5 sm:flex-row sm:items-center sm:justify-between`.trim()}>
      <div className="min-w-0">
        {backHref && <Link href={backHref} className="bp-muted mb-2 inline-flex items-center gap-1.5 text-[13px] hover:text-[var(--bp-text)]"><ChevronRight size={16} />{backLabel}</Link>}
        <h2 className="m-0">{title}</h2>
        <p className="bp-muted mb-0 mt-0.5 max-w-2xl text-[13px]">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function AdminPrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="bp-btn bp-btn-primary bp-frame">
      {children}
      <ChevronLeft size={15} />
    </Link>
  );
}

export function AdminPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`bp-frame relative ${className}`}>{children}</section>;
}

export function AdminEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid place-items-center px-5 py-12 text-center">
      <span className="mb-3 grid h-12 w-12 place-items-center border border-[var(--bp-divider)] text-[var(--bp-muted)]"><PackageOpen size={22} /></span>
      <strong className="text-sm">{title}</strong>
      <span className="bp-muted mt-1 text-xs">{description}</span>
    </div>
  );
}
