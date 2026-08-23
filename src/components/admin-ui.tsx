"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Card, Chip, buttonVariants } from "@heroui/react";
import { ChevronLeft, ChevronRight, PackageOpen } from "lucide-react";
import type { AdminTone } from "@/modules/admin/labels";

const tones: Record<AdminTone, string> = {
  neutral: "bg-[var(--surface-tertiary)] text-[var(--muted)] ring-[var(--border)]",
  info: "bg-blue-50 text-blue-700 ring-blue-100",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  danger: "bg-rose-50 text-rose-700 ring-rose-100",
  gold: "bg-[var(--warning)]/15 text-[var(--warning)] ring-[var(--warning)]/25",
};

export function AdminStatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: AdminTone }) {
  return <Chip size="sm" variant="soft" className={`font-bold ring-1 ring-inset ${tones[tone]}`}><Chip.Label>{children}</Chip.Label></Chip>;
}

export function AdminPageHeader({ eyebrow, title, description, action, backHref, backLabel = "بازگشت" }: { eyebrow?: string; title: string; description: string; action?: ReactNode; backHref?: string; backLabel?: string }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backHref && <Link href={backHref} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] transition hover:text-[var(--foreground)]"><ChevronRight size={17} />{backLabel}</Link>}
        {eyebrow && <span className="admin-page-eyebrow mb-1 block text-xs font-bold text-[var(--warning)]">{eyebrow}</span>}
        <h1 className="m-0 text-2xl font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl">{title}</h1>
        <p className="mb-0 mt-1 max-w-2xl text-sm text-[var(--muted)]">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function AdminPrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className={buttonVariants({ variant: "primary", size: "md", className: "min-h-11 gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-foreground)] shadow-sm hover:bg-[var(--accent-hover)]" })}>{children}<ChevronLeft size={16} /></Link>;
}

export function AdminPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Card variant="secondary" className={`admin-panel relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm ${className}`}>
      <i className="admin-panel-corner admin-panel-corner--tl" aria-hidden="true" />
      <i className="admin-panel-corner admin-panel-corner--tr" aria-hidden="true" />
      <i className="admin-panel-corner admin-panel-corner--bl" aria-hidden="true" />
      <i className="admin-panel-corner admin-panel-corner--br" aria-hidden="true" />
      {children}
    </Card>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description: string }) {
  return <div className="grid place-items-center px-5 py-14 text-center"><span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface-tertiary)] text-[var(--muted)]"><PackageOpen size={22} /></span><strong className="text-sm text-[var(--foreground)]">{title}</strong><span className="mt-1 text-xs text-[var(--muted)]">{description}</span></div>;
}

export const adminFieldClass = "w-full rounded-xl border border-[var(--field-border)] bg-[var(--field-background)] px-3.5 py-3 text-sm text-[var(--field-foreground)] outline-none transition placeholder:text-[var(--field-placeholder)] focus:border-[var(--field-border-focus)] focus:ring-4 focus:ring-[var(--focus)]/10";
export const adminLabelClass = "grid gap-1.5 text-xs font-bold text-[var(--muted)]";
