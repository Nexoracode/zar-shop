"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Card, Chip, buttonVariants } from "@heroui/react";
import { ChevronLeft, PackageOpen } from "lucide-react";
import type { AdminTone } from "@/modules/admin/labels";

const tones: Record<AdminTone, string> = {
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  info: "bg-blue-50 text-blue-700 ring-blue-100",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  danger: "bg-rose-50 text-rose-700 ring-rose-100",
  gold: "bg-[#f8f1e4] text-[#846325] ring-[#ead8b7]",
};

export function AdminStatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: AdminTone }) {
  return <Chip size="sm" variant="soft" className={`font-bold ring-1 ring-inset ${tones[tone]}`}><Chip.Label>{children}</Chip.Label></Chip>;
}

export function AdminPageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <span className="mb-1 block text-xs font-bold text-[#9a7434]">{eyebrow}</span>}
        <h1 className="m-0 text-2xl font-black tracking-[-0.02em] text-[#17233b] sm:text-3xl">{title}</h1>
        <p className="mb-0 mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function AdminPrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className={buttonVariants({ variant: "primary", size: "md", className: "min-h-11 gap-2 rounded-xl bg-[#172b4d] px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(23,43,77,0.14)] hover:bg-[#203b66]" })}>{children}<ChevronLeft size={16} /></Link>;
}

export function AdminPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <Card variant="secondary" className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)] ${className}`}>{children}</Card>;
}

export function AdminEmptyState({ title, description }: { title: string; description: string }) {
  return <div className="grid place-items-center px-5 py-14 text-center"><span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><PackageOpen size={22} /></span><strong className="text-sm text-slate-700">{title}</strong><span className="mt-1 text-xs text-slate-400">{description}</span></div>;
}

export const adminFieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#b5904c] focus:ring-4 focus:ring-[#b5904c]/10";
export const adminLabelClass = "grid gap-1.5 text-xs font-bold text-slate-600";
