"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Card, Chip, buttonVariants } from "@heroui/react";
import { ChevronLeft, ChevronRight, PackageOpen } from "lucide-react";
import type { AdminTone } from "@/modules/admin/labels";
import { useAdminTemplate } from "@/components/admin/template-context";
import { BpTag } from "@/components/admin/blueprint/ui/tag";

const tones: Record<AdminTone, string> = {
  neutral: "bg-[var(--surface-tertiary)] text-[var(--muted)] ring-[var(--border)]",
  info: "bg-blue-50 text-blue-700 ring-blue-100",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  danger: "bg-rose-50 text-rose-700 ring-rose-100",
  gold: "bg-[var(--warning)]/15 text-[var(--warning)] ring-[var(--warning)]/25",
};

/*
 * These five primitives are imported by almost every admin page, so they are the single seam
 * where the panel switches skins: each one renders its classic (HeroUI) markup or its blueprint
 * (HeroUI-free) markup depending on the template the surrounding shell declared. The context
 * defaults to CLASSIC, which is what keeps non-admin consumers of this module unchanged.
 */

export function AdminStatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: AdminTone }) {
  const template = useAdminTemplate();
  if (template === "BLUEPRINT") return <BpTag tone={tone} withDot>{children}</BpTag>;
  return <Chip size="sm" variant="soft" className={`font-bold ring-1 ring-inset ${tones[tone]}`}><Chip.Label>{children}</Chip.Label></Chip>;
}

export function AdminPageHeader({ eyebrow, title, description, action, backHref, backLabel = "بازگشت", flush = false }: { eyebrow?: string; title: string; description: string; action?: ReactNode; backHref?: string; backLabel?: string; flush?: boolean }) {
  const template = useAdminTemplate();
  // Most pages stack the header and their content directly, so the header carries the gap
  // itself. A page whose own container already spaces its children passes `flush`, otherwise
  // the two add up and the first section sits twice as far down as the rest.
  const spacing = flush ? "" : "mb-6";
  if (template === "BLUEPRINT") {
    return (
      <header className={`${spacing} flex flex-col gap-4 border-b border-[var(--bp-divider)] pb-5 sm:flex-row sm:items-center sm:justify-between`.trim()}>
        <div className="min-w-0">
          {backHref && <Link href={backHref} className="bp-muted mb-3 inline-flex items-center gap-1.5 text-[13px] hover:text-[var(--bp-text)]"><ChevronRight size={16} />{backLabel}</Link>}
          {eyebrow && <div className="bp-kicker mb-1">{eyebrow}</div>}
          <h2 className="m-0">{title}</h2>
          <p className="bp-muted mb-0 mt-1 max-w-2xl text-[13px]">{description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
    );
  }
  return (
    <header className={`${spacing} flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between`.trim()}>
      <div className="min-w-0">
        {backHref && <Link href={backHref} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] transition hover:text-[var(--foreground)]"><ChevronRight size={17} />{backLabel}</Link>}
        {eyebrow && <span className="mb-1 block text-xs font-bold text-[var(--warning)]">{eyebrow}</span>}
        <h1 className="m-0 text-2xl font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl">{title}</h1>
        <p className="mb-0 mt-1 max-w-2xl text-sm text-[var(--muted)]">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function AdminPrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  const template = useAdminTemplate();
  if (template === "BLUEPRINT") {
    return (
      <Link href={href} className="bp-btn bp-btn-primary bp-frame">
                {children}
        <ChevronLeft size={15} />
      </Link>
    );
  }
  return <Link href={href} className={buttonVariants({ variant: "primary", size: "md", className: "min-h-11 gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-foreground)] shadow-sm hover:bg-[var(--accent-hover)]" })}>{children}<ChevronLeft size={16} /></Link>;
}

export function AdminPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  const template = useAdminTemplate();
  if (template === "BLUEPRINT") {
    return <section className={`bp-frame relative ${className}`}>{children}</section>;
  }
  return <Card variant="secondary" className={`overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm ${className}`}>{children}</Card>;
}

export function AdminEmptyState({ title, description }: { title: string; description: string }) {
  const template = useAdminTemplate();
  if (template === "BLUEPRINT") {
    return (
      <div className="grid place-items-center px-5 py-12 text-center">
        <span className="mb-3 grid h-12 w-12 place-items-center border border-[var(--bp-divider)] text-[var(--bp-muted)]"><PackageOpen size={22} /></span>
        <strong className="text-sm">{title}</strong>
        <span className="bp-muted mt-1 text-xs">{description}</span>
      </div>
    );
  }
  return <div className="grid place-items-center px-5 py-14 text-center"><span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface-tertiary)] text-[var(--muted)]"><PackageOpen size={22} /></span><strong className="text-sm text-[var(--foreground)]">{title}</strong><span className="mt-1 text-xs text-[var(--muted)]">{description}</span></div>;
}

/*
 * Field styling stays a plain class string because ~96 call sites spread it onto native inputs
 * outside of any React render. The trailing `admin-field` / `admin-field-label` markers are the
 * stable hook the blueprint stylesheet re-skins them through.
 */
export const adminFieldClass = "admin-field w-full rounded-xl border border-[var(--field-border)] bg-[var(--field-background)] px-3.5 py-3 text-sm text-[var(--field-foreground)] outline-none transition placeholder:text-[var(--field-placeholder)] focus:border-[var(--field-border-focus)] focus:ring-4 focus:ring-[var(--focus)]/10";
export const adminLabelClass = "admin-field-label grid gap-1.5 text-xs font-bold text-[var(--muted)]";
